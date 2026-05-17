import { booleanState, isUnavailable } from "./format";
import type { EntityDefinition, HassEntity } from "./types";

export type IconTone =
  | "action"
  | "alert"
  | "drive"
  | "network"
  | "snapshot"
  | "storage"
  | "system"
  | "temperature"
  | "update";

export interface IconVisualState {
  tone: IconTone;
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
  const tone = iconTone(definition);
  const available = Boolean(state && !isUnavailable(state));
  return {
    tone,
    active: Boolean(state && isActiveIcon(definition, state)),
    animated: available && animationsEnabled,
  };
}

function iconTone(definition: EntityDefinition): IconTone {
  const key = definition.key;
  if (key.includes("problem") || key.includes("risk") || definition.icon.includes("alert")) {
    return "alert";
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
  if (key.includes("update") || definition.domain === "update") {
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
  if (definition.domain === "switch" || definition.domain === "binary_sensor") {
    return booleanState(state);
  }
  if (definition.domain === "update") {
    return state.state === "on";
  }
  if (definition.domain === "button") {
    return false;
  }
  return true;
}
