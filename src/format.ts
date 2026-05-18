import type { HassEntity, HomeAssistant } from "./types";
export {
  entityDisplayName as friendlyName,
  entityDisplayState as displayState,
  normalizeDisplayText,
  stripDeviceNamePrefix,
} from "./display-text";

const UNAVAILABLE_STATES = new Set(["unavailable"]);

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToStep(value: number, step: number, offset = 0): number {
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }
  const decimals = Math.max(decimalPlaces(step), decimalPlaces(offset));
  return Number((offset + Math.round((value - offset) / step) * step).toFixed(decimals));
}

export function roundToStepWithinBounds(
  value: number,
  step: number,
  min?: number,
  max?: number,
): number {
  const lower = min ?? Number.NEGATIVE_INFINITY;
  const upper = max ?? Number.POSITIVE_INFINITY;
  const offset = min ?? 0;
  let rounded = roundToStep(clamp(value, lower, upper), step, offset);

  if (max !== undefined && rounded > max) {
    rounded = stepFloor(max, step, offset);
  }
  if (min !== undefined && rounded < min) {
    rounded = stepCeil(min, step, offset);
  }

  return clamp(rounded, lower, upper);
}

function stepFloor(value: number, step: number, offset: number): number {
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }
  const decimals = Math.max(decimalPlaces(step), decimalPlaces(offset), decimalPlaces(value));
  return Number((offset + Math.floor((value - offset) / step) * step).toFixed(decimals));
}

function stepCeil(value: number, step: number, offset: number): number {
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }
  const decimals = Math.max(decimalPlaces(step), decimalPlaces(offset), decimalPlaces(value));
  return Number((offset + Math.ceil((value - offset) / step) * step).toFixed(decimals));
}

function decimalPlaces(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const [, decimals = ""] = String(value).split(".");
  return decimals.length;
}
