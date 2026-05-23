import {
  DYNAMIC_ENTITY_DEFINITIONS,
  ENTITY_DEFINITIONS,
  STATIC_ENTITY_DEFINITIONS,
} from "./catalog";
import { normalizeDisplayText } from "./display-text";
import { definitionAliases, definitionIdentityScore } from "./entity-matching";
import { objectIdFromEntityId, slugify } from "./format";
import type {
  DiscoveredEntities,
  EntityDefinition,
  EntityDomain,
  EntityGroup,
  EntityGroupKind,
  EntityKey,
  HassEntity,
  HassRegistryEntity,
  HomeAssistant,
  NormalizedUnifiDriveCardConfig,
} from "./types";
import { INTEGRATION_DOMAIN } from "./types";

type DiscoveryCandidates = Partial<Record<EntityDomain, string[]>>;
const DISCOVERY_DOMAIN_SET = new Set<EntityDomain>(
  ENTITY_DEFINITIONS.map((definition) => definition.domain),
);

const DYNAMIC_KEY_ALIASES: Record<EntityKey, string[]> = {
  backup_run: ["run_backup", "backup"],
  drive_power_on_hours: ["power_on_hours"],
  drive_status: ["status"],
  drive_temperature: ["temperature"],
  pool_at_risk_drive_count: ["at_risk_drive_count"],
  pool_available: ["available"],
  pool_average_drive_temperature: ["average_drive_temperature"],
  pool_capacity: ["capacity"],
  pool_drive_count: ["drive_count"],
  pool_maintenance_active: ["maintenance_active"],
  pool_problem: ["problem"],
  pool_raid_level: ["raid_level"],
  pool_rebuild_progress: ["rebuild_progress"],
  pool_status: ["status"],
  pool_sync_progress: ["sync_progress"],
  pool_usage_percent: ["usage"],
  pool_used: ["used"],
  snapshot_create: ["create", "create_snapshot"],
  snapshot_enabled: ["enabled", "snapshots"],
  snapshot_inventory: ["inventory", "snapshot_inventory"],
  snapshot_limit: ["limit", "snapshot_limit"],
  snapshot_month_day: ["month_day", "snapshot_month_day"],
  snapshot_schedule: ["schedule", "snapshot_schedule"],
  snapshot_schedule_time: ["schedule_time", "snapshot_schedule_time"],
  snapshot_weekday: ["weekday", "snapshot_weekday"],
};
const DYNAMIC_KEY_ALIAS_SLUGS = Object.fromEntries(
  Object.entries(DYNAMIC_KEY_ALIASES).map(([key, aliases]) => [
    key,
    aliases.map(slugify),
  ]),
) as Record<string, string[]>;

export function discoverEntities(
  hass: HomeAssistant,
  config: NormalizedUnifiDriveCardConfig,
): DiscoveredEntities {
  const states = stateMap(hass);
  const hiddenEntityKeys = new Set(config.hide_entities);
  const configuredDeviceId = config.device_id ?? null;
  const discoveryCandidates = collectDiscoveryCandidates(hass, states, configuredDeviceId);
  const baseEntity = findBaseEntity(hass, config, discoveryCandidates.sensor ?? []);
  const baseRegistry = registryEntry(hass, baseEntity);
  const deviceId = configuredDeviceId ?? baseRegistry?.device_id ?? inferredDeviceId(hass);
  const domainCandidates =
    (deviceId ?? null) === configuredDeviceId
      ? discoveryCandidates
      : collectDiscoveryCandidates(hass, states, deviceId ?? null);
  const entityIds: Record<EntityKey, string> = {};
  const groups = emptyGroups();

  for (const definition of STATIC_ENTITY_DEFINITIONS) {
    if (hiddenEntityKeys.has(definition.key)) {
      continue;
    }
    const explicit = explicitEntity(config, definition.key, definition.domain);
    const explicitEntityId = existingEntity(states, explicit, definition.domain);
    if (explicitEntityId) {
      entityIds[definition.key] = explicitEntityId;
      continue;
    }
    const discovered = discoverEntityForDefinition(
      hass,
      definition,
      deviceId ?? null,
      domainCandidates[definition.domain] ?? [],
    );
    if (discovered) {
      entityIds[definition.key] = discovered;
    }
  }

  for (const definition of DYNAMIC_ENTITY_DEFINITIONS) {
    if (hiddenEntityKeys.has(definition.key)) {
      continue;
    }
    for (const entityId of domainCandidates[definition.domain] ?? []) {
      const state = states[entityId];
      if (!state) {
        continue;
      }
      const registry = registryEntry(hass, entityId);
      if (!dynamicDefinitionMatches(entityId, state, registry, definition)) {
        continue;
      }
      const group = groupForEntity(entityId, state, registry, definition);
      if (!group) {
        continue;
      }
      const existing = groups[group.kind].find((candidate) => candidate.id === group.id);
      if (existing) {
        existing.entityIds[definition.key] = entityId;
      } else {
        group.entityIds[definition.key] = entityId;
        groups[group.kind].push(group);
      }
    }
  }

  for (const groupList of Object.values(groups)) {
    groupList.sort((left, right) => left.name.localeCompare(right.name));
  }

  const configEntryId =
    baseRegistry?.config_entry_id ??
    Object.values(entityIds)
      .map((entityId) => registryEntry(hass, entityId)?.config_entry_id)
      .find((entryId): entryId is string => typeof entryId === "string" && entryId.length > 0);

  return {
    baseEntity,
    configEntryId,
    deviceId: deviceId ?? undefined,
    entityIds,
    groups,
    definitions: ENTITY_DEFINITIONS,
  };
}

function explicitEntity(
  config: NormalizedUnifiDriveCardConfig,
  key: EntityKey,
  domain: EntityDomain,
): string | undefined {
  const direct = config.entities[key];
  if (typeof direct === "string") {
    return direct;
  }
  const domainValue = config.entities[domain];
  if (typeof domainValue === "string" && key === domain) {
    return domainValue;
  }
  if (domainValue && typeof domainValue === "object") {
    const nested = domainValue[key];
    if (typeof nested === "string") {
      return nested;
    }
  }
  return undefined;
}

function existingEntity(
  states: Record<string, HassEntity>,
  entityId: string | undefined,
  domain?: EntityDomain,
): string | undefined {
  if (!entityId || !states[entityId]) {
    return undefined;
  }
  if (domain && !entityId.startsWith(`${domain}.`)) {
    return undefined;
  }
  return entityId;
}

function emptyGroups(): Record<EntityGroupKind, EntityGroup[]> {
  return {
    backup: [],
    drive: [],
    pool: [],
    snapshot: [],
  };
}

function stateMap(hass: HomeAssistant): Record<string, HassEntity> {
  return hass.states && typeof hass.states === "object" && !Array.isArray(hass.states)
    ? hass.states
    : {};
}

function collectDiscoveryCandidates(
  hass: HomeAssistant,
  states: Record<string, HassEntity>,
  deviceId: string | null,
): DiscoveryCandidates {
  const candidates: DiscoveryCandidates = {};
  for (const entityId of Object.keys(states)) {
    const domain = entityDomainFromEntityId(entityId);
    if (!domain) {
      continue;
    }
    const registry = registryEntry(hass, entityId);
    if (
      registry?.platform !== INTEGRATION_DOMAIN ||
      registry.disabled_by ||
      registry.hidden_by ||
      registry.hidden === true
    ) {
      continue;
    }
    if (deviceId && registry.device_id !== deviceId) {
      continue;
    }
    (candidates[domain] ??= []).push(entityId);
  }
  return candidates;
}

function entityDomainFromEntityId(entityId: string): EntityDomain | undefined {
  const [domain] = entityId.split(".", 1);
  return domain && DISCOVERY_DOMAIN_SET.has(domain as EntityDomain)
    ? (domain as EntityDomain)
    : undefined;
}

function findBaseEntity(
  hass: HomeAssistant,
  config: NormalizedUnifiDriveCardConfig,
  candidates: readonly string[],
): string | undefined {
  const configuredDevice = config.device_id;
  const scored = candidates
    .map((entityId) => {
      const registry = registryEntry(hass, entityId);
      if (configuredDevice && registry?.device_id !== configuredDevice) {
        return { entityId, score: -1 };
      }
      const objectId = objectIdFromEntityId(entityId);
      const translationKey = registry?.translation_key ?? "";
      let score = 50;
      if (registry?.device_id) {
        score += 20;
      }
      if (["system_status", "overall_status", "usage_percent"].includes(translationKey)) {
        score += 60;
      }
      if (hasBaseEntityEvidence(objectId)) {
        score += 20;
      }
      return { entityId, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.entityId.localeCompare(right.entityId));
  return scored[0]?.entityId;
}

function inferredDeviceId(hass: HomeAssistant): string | undefined {
  return Object.entries(hass.entities ?? {})
    .filter(([, registry]) => registry.platform === INTEGRATION_DOMAIN)
    .map(([, registry]) => registry.device_id)
    .find((deviceId): deviceId is string => typeof deviceId === "string" && deviceId.length > 0);
}

function hasBaseEntityEvidence(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return /(^|_)(system_status|overall_status|usage_percent|unifi_unas|unas)($|_)/.test(
    slugify(value),
  );
}

function discoverEntityForDefinition(
  hass: HomeAssistant,
  definition: EntityDefinition,
  deviceId: string | null,
  candidates: readonly string[],
): string | undefined {
  let best: { entityId: string; score: number } | undefined;
  for (const entityId of candidates) {
    const score = entityScore(hass, entityId, definition, deviceId);
    if (score <= 0) {
      continue;
    }
    if (!best || score > best.score || (score === best.score && entityId < best.entityId)) {
      best = { entityId, score };
    }
  }
  return best?.entityId;
}

function entityScore(
  hass: HomeAssistant,
  entityId: string,
  definition: EntityDefinition,
  deviceId: string | null,
): number {
  const registry = registryEntry(hass, entityId);
  const semanticScore = definitionIdentityScore(definition, entityId, registry);
  let score = 0;

  if (deviceId && registry?.device_id === deviceId) {
    score += 60;
  }
  return semanticScore > 0 ? score + semanticScore : 0;
}

function dynamicDefinitionMatches(
  entityId: string,
  state: HassEntity,
  registry: HassRegistryEntity | undefined,
  definition: EntityDefinition,
): boolean {
  if (!entityId.startsWith(`${definition.domain}.`)) {
    return false;
  }
  const aliases = definitionAliases(definition);
  if (definition.dynamic && !hasDynamicKindEvidence(entityId, state, registry, definition.dynamic, aliases)) {
    return false;
  }
  const extraAliases = DYNAMIC_KEY_ALIAS_SLUGS[definition.key] ?? [];
  const allAliases = [...aliases, ...extraAliases];
  const candidates = [
    objectIdFromEntityId(entityId),
    registry?.translation_key,
    registry?.unique_id,
  ]
    .filter((value): value is string => typeof value === "string")
    .map(slugify);

  return candidates.some((candidate) =>
    allAliases.some((alias) => slugContainsAlias(candidate, alias)),
  );
}

function slugContainsAlias(candidate: string, alias: string): boolean {
  return (
    candidate === alias ||
    candidate.startsWith(`${alias}_`) ||
    candidate.endsWith(`_${alias}`) ||
    candidate.includes(`_${alias}_`)
  );
}

function hasDynamicKindEvidence(
  entityId: string,
  state: HassEntity,
  registry: HassRegistryEntity | undefined,
  kind: EntityGroupKind,
  aliases: string[] = [],
): boolean {
  if (attributeText(state, groupIdAttribute(kind)) || attributeText(state, groupNameAttribute(kind))) {
    return true;
  }
  const uniqueId = slugify(registry?.unique_id ?? "");
  if (uniqueId.includes(`_${kind}_`)) {
    return true;
  }
  const objectId = objectIdFromEntityId(entityId);
  if (objectId.startsWith(`${kind}_`) || objectId.includes(`_${kind}_`)) {
    return true;
  }
  if (kind === "snapshot" && aliases.some((alias) => objectId === alias)) {
    return true;
  }
  if (kind === "drive") {
    return objectId.startsWith("disk_") || objectId.includes("_disk_");
  }
  return false;
}

function groupForEntity(
  entityId: string,
  state: HassEntity,
  registry: HassRegistryEntity | undefined,
  definition: EntityDefinition,
): EntityGroup | undefined {
  const kind = definition.dynamic;
  if (!kind) {
    return undefined;
  }
  const attributeId = attributeText(state, groupIdAttribute(kind));
  const uniqueId = groupIdFromUniqueId(registry?.unique_id, kind, definition.key);
  const objectId = groupIdFromObjectId(entityId, definition.key);
  const id =
    attributeId ??
    (kind === "snapshot" ? objectId ?? uniqueId : uniqueId ?? objectId);
  if (!id) {
    return undefined;
  }
  return {
    kind,
    id,
    name: groupName(state, kind, definition, id),
    type: kind === "snapshot" ? attributeText(state, "target_type") : undefined,
    entityIds: {},
  };
}

function groupName(
  state: HassEntity,
  kind: EntityGroupKind,
  definition: EntityDefinition,
  id: string,
): string {
  const attributeName = attributeText(state, groupNameAttribute(kind));
  if (attributeName) {
    return attributeName;
  }
  const friendly = normalizeDisplayText(state.attributes.friendly_name, id);
  if (!friendly) {
    return id;
  }
  const suffix = slugify(definition.label);
  const cleaned = friendly.replace(new RegExp(`\\s+${escapeRegExp(definition.label)}$`, "i"), "");
  return slugify(cleaned) === suffix ? id : cleaned;
}

function groupIdAttribute(kind: EntityGroupKind): string {
  switch (kind) {
    case "backup":
      return "task_id";
    case "drive":
      return "drive_key";
    case "pool":
      return "pool_key";
    case "snapshot":
      return "target_key";
  }
}

function groupNameAttribute(kind: EntityGroupKind): string {
  switch (kind) {
    case "backup":
      return "task_name";
    case "drive":
      return "drive_name";
    case "pool":
      return "pool_name";
    case "snapshot":
      return "target_name";
  }
}

function groupIdFromUniqueId(
  uniqueId: string | null | undefined,
  kind: EntityGroupKind,
  key: EntityKey,
): string | undefined {
  if (!uniqueId) {
    return undefined;
  }
  const normalizedKey = key.replace(/^snapshot_/, "").replace(/^backup_/, "");
  const dynamicAliases = DYNAMIC_KEY_ALIASES[key] ?? [normalizedKey];
  for (const alias of dynamicAliases.map(slugify)) {
    const suffix = `_${alias}`;
    if (uniqueId.endsWith(suffix)) {
      const stripped = uniqueId.slice(0, -suffix.length);
      const marker = `_${kind}_`;
      const markerIndex = stripped.lastIndexOf(marker);
      if (markerIndex >= 0) {
        return stripped.slice(markerIndex + marker.length);
      }
    }
  }
  if (kind === "snapshot") {
    const marker = "_snapshot_";
    const markerIndex = uniqueId.indexOf(marker);
    if (markerIndex >= 0) {
      return uniqueId.slice(markerIndex + marker.length);
    }
  }
  if (kind === "backup") {
    const marker = "_backup_";
    const markerIndex = uniqueId.indexOf(marker);
    if (markerIndex >= 0) {
      return uniqueId.slice(markerIndex + marker.length);
    }
  }
  return undefined;
}

function groupIdFromObjectId(entityId: string, key: EntityKey): string | undefined {
  const objectId = objectIdFromEntityId(entityId);
  const aliases = [key, ...(DYNAMIC_KEY_ALIASES[key] ?? [])].map(slugify);
  for (const alias of aliases) {
    if (objectId === alias) {
      return objectId;
    }
    if (objectId.endsWith(`_${alias}`)) {
      return objectId.slice(0, -alias.length - 1);
    }
  }
  return undefined;
}

function registryEntry(
  hass: HomeAssistant,
  entityId: string | undefined,
): HassRegistryEntity | undefined {
  if (!entityId) {
    return undefined;
  }
  return hass.entities?.[entityId];
}

function attributeText(state: HassEntity, key: string): string | undefined {
  const value = state.attributes[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  const text = String(value).trim();
  return text || undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
