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
    return state && normalizedState(state) === "off" ? "ok" : "neutral";
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
  if (ATTENTION_STATES.has(normalizedState(state))) {
    return true;
  }
  if (definition.domain === "binary_sensor" || definition.domain === "switch") {
    return booleanState(state);
  }
  const numeric = numericStateValue(state);
  if (numeric !== undefined && isAttentionDefinition(definition)) {
    return numeric > 0;
  }
  return ATTENTION_STATES.has(normalizedState(state));
}

function isHealthyState(state: HassEntity): boolean {
  return HEALTHY_STATES.has(normalizedState(state));
}

function isClearState(definition: EntityDefinition, state: HassEntity): boolean {
  const numeric = numericStateValue(state);
  return isHealthyState(state) || (isAttentionDefinition(definition) && numeric === 0);
}

function numericStateValue(state: HassEntity): number | undefined {
  const parsed = Number(state.state);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizedState(state: HassEntity): string {
  return state.state.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

const HEALTHY_STATES = new Set([
  "available",
  "connected",
  "healthy",
  "idle",
  "normal",
  "off",
  "ok",
  "online",
  "ready",
]);

const ATTENTION_STATES = new Set([
  "alert",
  "critical",
  "degraded",
  "disconnected",
  "error",
  "failed",
  "failure",
  "offline",
  "on",
  "problem",
  "unhealthy",
  "unavailable",
  "warning",
]);
