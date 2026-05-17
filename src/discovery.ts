import { ENTITY_DEFINITIONS } from "./catalog";
import { normalizeDisplayText } from "./display-text";
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

export function discoverEntities(
  hass: HomeAssistant,
  config: NormalizedUnifiDriveCardConfig,
): DiscoveredEntities {
  const configuredBase = existingEntity(hass, config.entity);
  const baseEntity = configuredBase ?? findBaseEntity(hass, config);
  const baseRegistry = registryEntry(hass, baseEntity);
  const deviceId = config.device_id ?? baseRegistry?.device_id ?? inferredDeviceId(hass);
  const entityIds: Record<EntityKey, string> = {};
  const groups = emptyGroups();

  for (const definition of ENTITY_DEFINITIONS) {
    if (definition.dynamic || config.hide_entities.includes(definition.key)) {
      continue;
    }
    const explicit = explicitEntity(config, definition.key, definition.domain);
    if (explicit) {
      entityIds[definition.key] = explicit;
      continue;
    }
    const discovered = discoverEntityForDefinition(hass, definition, deviceId ?? null);
    if (discovered) {
      entityIds[definition.key] = discovered;
    }
  }

  for (const [entityId, state] of Object.entries(hass.states)) {
    const registry = registryEntry(hass, entityId);
    if (!isAutoDiscoverable(hass, entityId)) {
      continue;
    }
    if (!isIntegrationEntity(hass, entityId)) {
      continue;
    }
    if (deviceId && registry?.device_id && registry.device_id !== deviceId) {
      continue;
    }
    const definition = dynamicDefinitionForEntity(entityId, state, registry);
    if (!definition || config.hide_entities.includes(definition.key)) {
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

export function explicitEntity(
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

export function isAutoDiscoverable(hass: HomeAssistant, entityId: string): boolean {
  const registry = registryEntry(hass, entityId);
  return !registry?.disabled_by && !registry?.hidden_by && registry?.hidden !== true;
}

function emptyGroups(): Record<EntityGroupKind, EntityGroup[]> {
  return {
    backup: [],
    drive: [],
    pool: [],
    snapshot: [],
  };
}

function findBaseEntity(
  hass: HomeAssistant,
  config: NormalizedUnifiDriveCardConfig,
): string | undefined {
  const configuredDevice = config.device_id;
  const candidates = Object.keys(hass.states)
    .filter((entityId) => isAutoDiscoverable(hass, entityId))
    .filter((entityId) => isIntegrationEntity(hass, entityId));
  const scored = candidates
    .map((entityId) => {
      const registry = registryEntry(hass, entityId);
      if (configuredDevice && registry?.device_id !== configuredDevice) {
        return { entityId, score: -1 };
      }
      const objectId = objectIdFromEntityId(entityId);
      const translationKey = registry?.translation_key ?? "";
      let score = registry?.platform === INTEGRATION_DOMAIN ? 50 : 0;
      if (registry?.device_id) {
        score += 20;
      }
      if (["system_status", "overall_status", "usage_percent"].includes(translationKey)) {
        score += 60;
      }
      if (/(system_status|overall_status|usage_percent|unifi_drive)/.test(objectId)) {
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

function discoverEntityForDefinition(
  hass: HomeAssistant,
  definition: EntityDefinition,
  deviceId: string | null,
): string | undefined {
  let best: { entityId: string; score: number } | undefined;
  for (const entityId of Object.keys(hass.states)) {
    if (!entityId.startsWith(`${definition.domain}.`)) {
      continue;
    }
    if (!isAutoDiscoverable(hass, entityId)) {
      continue;
    }
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
  const objectId = objectIdFromEntityId(entityId);
  const aliases = definitionAliases(definition);
  let score = 0;
  let matched = false;

  if (registry?.platform === INTEGRATION_DOMAIN) {
    score += 40;
  }
  if (deviceId && registry?.device_id === deviceId) {
    score += 60;
  }
  if (registry?.translation_key && aliases.includes(slugify(registry.translation_key))) {
    score += 90;
    matched = true;
  }
  if (registry?.unique_id && aliases.some((alias) => registry.unique_id?.endsWith(`_${alias}`))) {
    score += 75;
    matched = true;
  }
  if (aliases.some((alias) => objectId === alias || objectId.endsWith(`_${alias}`))) {
    score += 45;
    matched = true;
  }

  const friendly = hass.states[entityId]?.attributes.friendly_name;
  if (typeof friendly === "string" && aliases.some((alias) => slugify(friendly).includes(alias))) {
    score += 15;
    matched = true;
  }
  return matched ? score : 0;
}

function dynamicDefinitionForEntity(
  entityId: string,
  state: HassEntity,
  registry?: HassRegistryEntity,
): EntityDefinition | undefined {
  const dynamicDefinitions = ENTITY_DEFINITIONS.filter((definition) => definition.dynamic);
  return dynamicDefinitions.find((definition) =>
    dynamicDefinitionMatches(entityId, state, registry, definition),
  );
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
  if (definition.dynamic && !hasDynamicKindEvidence(entityId, state, registry, definition.dynamic)) {
    return false;
  }
  const aliases = definitionAliases(definition);
  const extraAliases = DYNAMIC_KEY_ALIASES[definition.key] ?? [];
  const candidates = [
    objectIdFromEntityId(entityId),
    registry?.translation_key,
    registry?.unique_id,
    state.attributes.friendly_name,
  ]
    .filter((value): value is string => typeof value === "string")
    .map(slugify);

  return candidates.some((candidate) =>
    [...aliases, ...extraAliases.map(slugify)].some(
      (alias) =>
        candidate === alias ||
        candidate.endsWith(`_${alias}`) ||
        candidate.includes(`_${alias}_`) ||
        candidate.includes(alias),
    ),
  );
}

function hasDynamicKindEvidence(
  entityId: string,
  state: HassEntity,
  registry: HassRegistryEntity | undefined,
  kind: EntityGroupKind,
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
  const id =
    attributeText(state, groupIdAttribute(kind)) ??
    groupIdFromUniqueId(registry?.unique_id, kind, definition.key) ??
    groupIdFromObjectId(entityId, definition.key);
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
    if (objectId.endsWith(`_${alias}`)) {
      return objectId.slice(0, -alias.length - 1);
    }
  }
  return undefined;
}

function definitionAliases(definition: EntityDefinition): string[] {
  return [
    definition.key,
    slugify(definition.label),
    ...(definition.aliases ?? []),
  ].map(slugify);
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

function existingEntity(hass: HomeAssistant, entityId: string | undefined): string | undefined {
  return entityId && hass.states[entityId] ? entityId : undefined;
}

function isIntegrationEntity(hass: HomeAssistant, entityId: string): boolean {
  const registry = registryEntry(hass, entityId);
  if (registry?.platform === INTEGRATION_DOMAIN) {
    return true;
  }
  const state = hass.states[entityId];
  const objectId = objectIdFromEntityId(entityId);
  const friendly = String(state?.attributes.friendly_name ?? "");
  return slugify(objectId).includes("unifi_drive") || slugify(friendly).includes("unifi_drive");
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
