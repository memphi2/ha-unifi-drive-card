import { entityLabel, languageCode, localize } from "./i18n";
import type { EntityDefinition, HassEntity, HomeAssistant } from "./types";

const TEXT_UNAVAILABLE_STATES = new Set(["unavailable"]);
const DEVICE_PREFIX_PATTERN =
  /^(?:(?:ubiquiti|unifi)\s+)?(?:unifi[\s_-]*)?drive(?:\s*\/\s*unas|\s+unas)?\b/i;
const DEVICE_PREFIX_DECORATION =
  /^(?:\s*(?:card|integration|unas|storage|system))?(?:\s*[-:–—/|]\s*|\s+|$)/i;

export function normalizeDisplayText(value: unknown, fallback = ""): string {
  const text = textValue(value);
  if (!text) {
    return fallback.trim();
  }
  const stripped = deviceNameSuffix(text);
  if (stripped) {
    return stripped;
  }
  const fallbackText = textValue(fallback);
  if (!fallbackText || fallbackText === text) {
    return "";
  }
  return deviceNameSuffix(fallbackText) || fallbackText;
}

export function hasDeviceNamePrefix(value: unknown): boolean {
  const text = textValue(value);
  return Boolean(text && DEVICE_PREFIX_PATTERN.test(text));
}

export function deviceNameSuffix(value: unknown): string {
  let text = textValue(value);
  if (!text) {
    return "";
  }
  for (let index = 0; index < 4; index += 1) {
    const withoutPrefix = text.replace(DEVICE_PREFIX_PATTERN, "");
    if (withoutPrefix === text) {
      break;
    }
    text = withoutPrefix.replace(DEVICE_PREFIX_DECORATION, "").trim();
  }
  return cleanupDisplayText(text);
}

export function stripDeviceNamePrefix(value: string, fallback = value): string {
  return normalizeDisplayText(value, fallback) || normalizeDisplayText(fallback) || value.trim();
}

export function entityDisplayName(
  definition: EntityDefinition,
  state?: HassEntity,
  hass?: HomeAssistant,
): string {
  const fallback = entityLabel(definition, hass).trim();
  const rawName = formattedEntityName(hass, state) ?? state?.attributes.friendly_name;
  const name = normalizeDisplayText(rawName, fallback) || fallback;
  if (
    languageCode(hass) === "de" &&
    hasDeviceNamePrefix(rawName) &&
    looksLikeGeneratedName(definition, name)
  ) {
    return fallback;
  }
  return name;
}

export function entityDisplayState(hass: HomeAssistant, state?: HassEntity): string {
  if (!state) {
    return localize(hass, "state.not_found");
  }
  const formatted = hass.formatEntityState?.(state);
  if (formatted) {
    return normalizeDisplayText(formatted) || localize(hass, "state.unknown");
  }
  const localized = localizedState(hass, state.state);
  if (localized) {
    return localized;
  }
  const value = normalizeDisplayText(state.state) || localize(hass, "state.unknown");
  const unit = state.attributes.unit_of_measurement;
  return typeof unit === "string" && !TEXT_UNAVAILABLE_STATES.has(state.state)
    ? `${value} ${unit}`
    : value;
}

export function cardDisplayTitle(
  configuredName: unknown,
  definition: EntityDefinition,
  state: HassEntity | undefined,
  hass: HomeAssistant,
): string {
  const fallback = entityDisplayName(definition, state, hass);
  if (typeof configuredName === "string" && configuredName.trim()) {
    return normalizeDisplayText(configuredName, fallback) || fallback;
  }
  return fallback;
}

function formattedEntityName(
  hass: HomeAssistant | undefined,
  state: HassEntity | undefined,
): string | undefined {
  if (!hass?.formatEntityName || !state) {
    return undefined;
  }
  try {
    const formatted = hass.formatEntityName(state, [{ type: "entity" }], {
      separator: " ",
    });
    return typeof formatted === "string" && formatted.trim() ? formatted : undefined;
  } catch {
    return undefined;
  }
}

function cleanupDisplayText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function textValue(value: unknown): string {
  return typeof value === "string" ? cleanupDisplayText(value) : "";
}

function looksLikeGeneratedName(definition: EntityDefinition, value: string): boolean {
  const candidate = slugify(value);
  const fallback = slugify(definition.label);
  return candidate === fallback || fallback.endsWith(candidate);
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function localizedState(hass: HomeAssistant, value: string): string | undefined {
  switch (value) {
    case "off":
      return localize(hass, "button.off");
    case "on":
      return localize(hass, "button.on");
    case "unavailable":
      return localize(hass, "state.unavailable");
    case "unknown":
      return localize(hass, "state.unknown");
    default:
      return undefined;
  }
}
