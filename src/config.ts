import { DEFAULT_SECTIONS } from "./catalog";
import { DEFAULT_TAP_ACTION, normalizeActionConfig } from "./card-actions";
import type {
  NormalizedUnifiDriveCardConfig,
  SectionId,
  UnifiDriveCardConfig,
} from "./types";

const SECTION_SET = new Set<string>(DEFAULT_SECTIONS);

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
    compact: config.compact ?? false,
    show_unavailable: config.show_unavailable ?? false,
    show_optional: config.show_optional ?? false,
    show_diagnostics: config.show_diagnostics ?? true,
    show_dangerous_actions: config.show_dangerous_actions ?? false,
    show_icon_animations: config.show_icon_animations ?? true,
    max_sensor_rows: positiveInteger(config.max_sensor_rows, 12),
    sections: normalizeSections(config.sections),
    hide_entities: Array.isArray(config.hide_entities) ? [...config.hide_entities] : [],
    entities: config.entities ? { ...config.entities } : {},
  };
}

export function normalizeSections(sections: SectionId[] | undefined): SectionId[] {
  if (!sections?.length) {
    return [...DEFAULT_SECTIONS];
  }
  const normalized = sections.filter((section): section is SectionId =>
    SECTION_SET.has(section),
  );
  return normalized.length ? normalized : [...DEFAULT_SECTIONS];
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}
