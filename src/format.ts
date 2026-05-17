import type { HassEntity, HomeAssistant } from "./types";
export {
  cardDisplayTitle,
  deviceNameSuffix,
  entityDisplayName as friendlyName,
  entityDisplayState as displayState,
  hasDeviceNamePrefix,
  normalizeDisplayText,
  stripDeviceNamePrefix,
} from "./display-text";

const UNAVAILABLE_STATES = new Set(["unavailable"]);

export function domainFromEntityId(entityId: string): string {
  return entityId.split(".", 1)[0] ?? "";
}

export function objectIdFromEntityId(entityId: string): string {
  return entityId.includes(".") ? entityId.split(".").slice(1).join(".") : entityId;
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function entityState(hass: HomeAssistant, entityId?: string): HassEntity | undefined {
  if (!entityId) {
    return undefined;
  }
  const state = hass.states[entityId];
  return state ? { ...state, entity_id: entityId } : undefined;
}

export function isUnavailable(state?: HassEntity): boolean {
  return !state || UNAVAILABLE_STATES.has(state.state);
}

export function numericState(state?: HassEntity): number | undefined {
  if (!state || UNAVAILABLE_STATES.has(state.state)) {
    return undefined;
  }
  return parseFiniteNumber(state.state);
}

export function numericAttribute(
  state: HassEntity | undefined,
  key: string,
): number | undefined {
  return parseFiniteNumber(state?.attributes[key]);
}

export function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function booleanState(state?: HassEntity): boolean {
  return state?.state === "on" || state?.state === "heat" || state?.state === "playing";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }
  const decimals = Math.max(0, String(step).split(".")[1]?.length ?? 0);
  return Number((Math.round(value / step) * step).toFixed(decimals));
}
