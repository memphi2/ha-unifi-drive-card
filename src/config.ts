import { DEFAULT_SECTIONS, ENTITY_DEFINITIONS } from "./catalog";
import { DEFAULT_TAP_ACTION, normalizeActionConfig } from "./card-actions";
import { OVERVIEW_KEYS } from "./entity-groups";
import type {
  EntityKey,
  NormalizedUnifiDriveCardConfig,
  SectionId,
  UnifiDriveCardConfig,
} from "./types";

const SECTION_SET = new Set<string>(DEFAULT_SECTIONS);
const OVERVIEW_ENTITY_KEY_SET = new Set<string>(
  ENTITY_DEFINITIONS.filter((definition) => !definition.dynamic).map(
    (definition) => definition.key,
  ),
);

export function normalizeConfig(
  config: UnifiDriveCardConfig,
): NormalizedUnifiDriveCardConfig {
  return {
    type: "custom:unifi-drive-card",
    entity: config.entity,
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
    max_sensor_rows: positiveInteger(config.max_sensor_rows, 10),
    sections: normalizeSections(config.sections),
    overview_entities: normalizeOverviewEntities(config.overview_entities),
    hide_entities: Array.isArray(config.hide_entities) ? [...config.hide_entities] : [],
    entities: config.entities ? { ...config.entities } : {},
  };
}

export function normalizeSections(sections: SectionId[] | undefined): SectionId[] {
  if (!sections?.length) {
    return [...DEFAULT_SECTIONS];
  }
  const normalized = [
    ...new Set(sections.filter((section): section is SectionId => SECTION_SET.has(section))),
  ];
  return normalized.length ? normalized : [...DEFAULT_SECTIONS];
}

export function normalizeOverviewEntities(keys: EntityKey[] | undefined): EntityKey[] {
  if (!Array.isArray(keys)) {
    return [...OVERVIEW_KEYS];
  }
  return [...new Set(keys.filter((key) => OVERVIEW_ENTITY_KEY_SET.has(key)))];
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}
