import { DEFAULT_SECTIONS, ENTITY_DEFINITION_BY_KEY } from "./catalog";
import { DEFAULT_TAP_ACTION, normalizeActionConfig } from "./card-actions";
import { OVERVIEW_KEYS } from "./entity-groups";
import type {
  EntityDomain,
  EntityKey,
  NormalizedUnifiDriveCardConfig,
  SectionId,
  UnifiDriveCardConfig,
} from "./types";

const SECTION_SET = new Set<string>(DEFAULT_SECTIONS);
const ENTITY_KEY_SET = new Set<string>(Object.keys(ENTITY_DEFINITION_BY_KEY));
const OVERVIEW_ENTITY_KEY_SET = new Set<string>(
  Object.values(ENTITY_DEFINITION_BY_KEY)
    .filter((definition) => !definition.dynamic)
    .map((definition) => definition.key),
);
const ENTITY_DOMAIN_SET = new Set<string>([
  "binary_sensor",
  "button",
  "number",
  "select",
  "sensor",
  "switch",
  "time",
  "update",
]);

export function normalizeConfig(
  config: UnifiDriveCardConfig,
): NormalizedUnifiDriveCardConfig {
  return {
    type: "custom:unifi-drive-card",
    device_id: config.device_id,
    name: config.name,
    tap_action: normalizeActionConfig(config.tap_action) ?? { ...DEFAULT_TAP_ACTION },
    hold_action: normalizeActionConfig(config.hold_action),
    double_tap_action: normalizeActionConfig(config.double_tap_action),
    compact: config.compact ?? true,
    show_unavailable: config.show_unavailable ?? false,
    show_optional: config.show_optional ?? false,
    show_diagnostics: config.show_diagnostics ?? true,
    show_dangerous_actions: config.show_dangerous_actions ?? false,
    show_icon_animations: config.show_icon_animations ?? true,
    show_display_buttons: config.show_display_buttons ?? false,
    overview_columns: boundedInteger(config.overview_columns, 3, 1, 6),
    sections: normalizeSections(config.sections),
    overview_entities: normalizeOverviewEntities(config.overview_entities),
    section_entity_order: normalizeSectionEntityOrder(config.section_entity_order),
    hide_entities: normalizeEntityKeys(config.hide_entities),
    entities: normalizeEntityOverrides(config.entities),
  };
}

function normalizeSections(sections: SectionId[] | undefined): SectionId[] {
  if (!sections?.length) {
    return [...DEFAULT_SECTIONS];
  }
  const normalized = uniqueKnownItems(sections, SECTION_SET);
  return normalized.length ? normalized : [...DEFAULT_SECTIONS];
}

function normalizeOverviewEntities(keys: EntityKey[] | undefined): EntityKey[] {
  if (!Array.isArray(keys)) {
    return [...OVERVIEW_KEYS];
  }
  return uniqueKnownItems(keys, OVERVIEW_ENTITY_KEY_SET);
}

function normalizeSectionEntityOrder(
  value: unknown,
): Partial<Record<SectionId, EntityKey[]>> {
  if (!isRecord(value)) {
    return {};
  }
  const normalized: Partial<Record<SectionId, EntityKey[]>> = {};
  for (const [section, keys] of Object.entries(value)) {
    if (!SECTION_SET.has(section) || !Array.isArray(keys)) {
      continue;
    }
    const ordered = [
      ...new Set(
        keys.filter(
          (key): key is EntityKey =>
            isEntityKey(key) &&
            ENTITY_DEFINITION_BY_KEY[key]?.section === section,
        ),
      ),
    ];
    if (ordered.length) {
      normalized[section as SectionId] = ordered;
    }
  }
  return normalized;
}

function uniqueKnownItems<T extends string>(items: T[], knownItems: Set<string>): T[] {
  return [...new Set(items.filter((item) => knownItems.has(item)))];
}

function normalizeEntityKeys(value: unknown): EntityKey[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter((entry): entry is EntityKey => isEntityKey(entry)))];
}

function normalizeEntityOverrides(
  value: unknown,
): NormalizedUnifiDriveCardConfig["entities"] {
  if (!isRecord(value)) {
    return {};
  }
  const normalized: NormalizedUnifiDriveCardConfig["entities"] = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" && entry.trim() && isEntityKey(key)) {
      normalized[key] = entry.trim();
      continue;
    }
    if (!isRecord(entry) || !isEntityDomain(key)) {
      continue;
    }
    const nested: Record<string, string> = {};
    for (const [nestedKey, nestedValue] of Object.entries(entry)) {
      if (typeof nestedValue === "string" && nestedValue.trim() && isEntityKey(nestedKey)) {
        nested[nestedKey] = nestedValue.trim();
      }
    }
    if (Object.keys(nested).length) {
      normalized[key] = nested;
    }
  }
  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isEntityKey(value: unknown): value is EntityKey {
  return typeof value === "string" && ENTITY_KEY_SET.has(value);
}

function isEntityDomain(value: unknown): value is EntityDomain {
  return typeof value === "string" && ENTITY_DOMAIN_SET.has(value);
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}
