import { booleanState, isUnavailable } from "./format";
import type { EntityDefinition, HassEntity } from "./types";

export type IconTone =
  | "action"
  | "alert"
  | "drive"
  | "neutral"
  | "network"
  | "ok"
  | "snapshot"
  | "storage"
  | "system"
  | "temperature"
  | "update";

export interface IconVisualState {
  tone: IconTone;
  motion: IconTone;
  active: boolean;
  animated: boolean;
}

export function iconVisualClass(
  definition: EntityDefinition,
  state?: HassEntity,
  animationsEnabled = true,
): string {
  const visual = iconVisualState(definition, state, animationsEnabled);
  return [
    "icon-bubble",
    visual.tone,
    visual.animated ? `motion-${visual.motion}` : "",
    visual.animated ? "animated" : "",
    visual.active ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function iconVisualState(
  definition: EntityDefinition,
  state?: HassEntity,
  animationsEnabled = true,
): IconVisualState {
  const available = Boolean(state && !isUnavailable(state));
  const tone = iconTone(definition, state);
  const active = Boolean(state && available && isActiveIcon(definition, state));
  return {
    tone,
    motion: tone,
    active,
    animated: available && animationsEnabled && shouldAnimateIcon(definition, state),
  };
}

function iconTone(definition: EntityDefinition, state?: HassEntity): IconTone {
  const key = definition.key;
  if (isAttentionDefinition(definition)) {
    if (state && isAttentionState(definition, state)) {
      return "alert";
    }
    return state && isClearState(definition, state) ? "ok" : "neutral";
  }
  if (isStatusDefinition(definition)) {
    if (state && isAttentionState(definition, state)) {
      return "alert";
    }
    if (state && isHealthyState(state)) {
      return "ok";
    }
    return "neutral";
  }
  if (definition.domain === "update") {
    if (state?.state === "on") {
      return "update";
    }
    return state && normalizeStateToken(state.state) === "off" ? "ok" : "neutral";
  }
  if (key.includes("snapshot")) {
    return "snapshot";
  }
  if (key.includes("drive") || definition.icon.includes("harddisk")) {
    return "drive";
  }
  if (key.includes("temperature")) {
    return "temperature";
  }
  if (key.includes("update")) {
    return "update";
  }
  if (key.includes("ip") || key.includes("throughput") || definition.icon.includes("ethernet")) {
    return "network";
  }
  if (["fan_mode", "reboot", "shutdown", "wake_on_lan", "system_status"].includes(key)) {
    return "system";
  }
  if (definition.domain === "button") {
    return "action";
  }
  return "storage";
}

function isActiveIcon(definition: EntityDefinition, state: HassEntity): boolean {
  if (isAttentionDefinition(definition) || isStatusDefinition(definition)) {
    return isAttentionState(definition, state) || isClearState(definition, state);
  }
  if (definition.domain === "update") {
    return state.state === "on" || isHealthyState(state);
  }
  if (definition.domain === "switch" || definition.domain === "binary_sensor") {
    return booleanState(state);
  }
  if (definition.domain === "button") {
    return false;
  }
  return true;
}

function shouldAnimateIcon(definition: EntityDefinition, state?: HassEntity): boolean {
  if (!state) {
    return false;
  }
  if (isAttentionDefinition(definition) || isStatusDefinition(definition)) {
    return isAttentionState(definition, state);
  }
  if (definition.domain === "update") {
    return state.state === "on";
  }
  if (definition.domain === "switch" || definition.domain === "binary_sensor") {
    return booleanState(state);
  }
  if (definition.key.includes("throughput")) {
    return (numericStateValue(state) ?? 0) > 0;
  }
  return false;
}

function isAttentionDefinition(definition: EntityDefinition): boolean {
  const key = definition.key;
  return (
    key.includes("problem") ||
    key.includes("risk") ||
    key.includes("degraded") ||
    key.includes("error") ||
    definition.icon.includes("alert")
  );
}

function isStatusDefinition(definition: EntityDefinition): boolean {
  return definition.key.includes("status");
}

function isAttentionState(definition: EntityDefinition, state: HassEntity): boolean {
  if (isAlarmState(state.state)) {
    return true;
  }
  if (definition.domain === "binary_sensor" || definition.domain === "switch") {
    return booleanState(state);
  }
  const numeric = numericStateValue(state);
  if (numeric !== undefined && isAttentionDefinition(definition)) {
    return numeric > 0;
  }
  return false;
}

function isHealthyState(state: HassEntity): boolean {
  return isOkState(state.state) || isZeroState(state.state);
}

function isClearState(definition: EntityDefinition, state: HassEntity): boolean {
  const numeric = numericStateValue(state);
  return (
    isHealthyState(state) ||
    (isAttentionDefinition(definition) && numeric === 0) ||
    (isAttentionDefinition(definition) && isClearAttentionState(state.state))
  );
}

function numericStateValue(state: HassEntity): number | undefined {
  const parsed = Number(state.state);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isOkState(value: string): boolean {
  return OK_STATE_TOKENS.has(normalizeStateToken(value));
}

function isClearAttentionState(value: string): boolean {
  const state = normalizeStateToken(value);
  return CLEAR_ATTENTION_STATE_TOKENS.has(state);
}

function isZeroState(value: string): boolean {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric === 0;
}

function isAlarmState(value: string): boolean {
  const state = normalizeStateToken(value);
  if (!state || isOkState(state) || isZeroState(state) || isClearAttentionState(state)) {
    return false;
  }
  const numeric = Number(state);
  if (Number.isFinite(numeric)) {
    return numeric !== 0;
  }
  return (
    ALARM_STATE_TOKENS.has(state) || ALARM_STATE_PARTS.some((part) => state.includes(part))
  );
}

function normalizeStateToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

const OK_STATE_TOKENS = new Set([
  "0",
  "available",
  "connected",
  "fehlerfrei",
  "false",
  "healthy",
  "idle",
  "kein fehler",
  "keine stoerung",
  "keine störung",
  "none",
  "no error",
  "no fault",
  "normal",
  "off",
  "ok",
  "online",
  "ready",
  "verbunden",
]);

const CLEAR_ATTENTION_STATE_TOKENS = new Set(["false", "off"]);

const ALARM_STATE_TOKENS = new Set([
  "alarm",
  "alert",
  "critical",
  "degraded",
  "disconnected",
  "error",
  "failed",
  "failure",
  "fault",
  "fehler",
  "getrennt",
  "nicht verbunden",
  "offline",
  "on",
  "problem",
  "stoerung",
  "störung",
  "target below inlet",
  "unhealthy",
  "unavailable",
  "warning",
]);

const ALARM_STATE_PARTS = [
  "alarm",
  "error",
  "fault",
  "fehler",
  "problem",
  "stoerung",
  "störung",
];
