import type { UnifiDriveCardConfig } from "./types";

export type ActionConfigKey = "tap_action" | "hold_action" | "double_tap_action";
export type ActionTargetField = "entity_id" | "area_id" | "device_id";

export type EditorActionName =
  | "none"
  | "more-info"
  | "toggle"
  | "navigate"
  | "url"
  | "call-service";

export const ACTION_OPTIONS: EditorActionName[] = [
  "more-info",
  "toggle",
  "navigate",
  "url",
  "call-service",
  "none",
];

export interface ParsedActionData {
  valid: boolean;
  value?: Record<string, unknown>;
}

export function actionNameFromConfig(
  action: UnifiDriveCardConfig["tap_action"],
  key: ActionConfigKey,
): EditorActionName {
  const actionName = typeof action?.action === "string" ? action.action : undefined;
  if (actionName === "perform-action") {
    return "call-service";
  }
  if (isEditorActionName(actionName)) {
    return actionName;
  }
  return key === "tap_action" ? "more-info" : "none";
}

export function actionConfigFromEditor(
  key: ActionConfigKey,
  value: Record<string, unknown>,
): UnifiDriveCardConfig["tap_action"] | undefined {
  const action = isEditorActionName(value.action) ? value.action : actionNameFromConfig(value, key);
  if (action === "none") {
    return key === "tap_action" ? { action } : undefined;
  }

  const config: NonNullable<UnifiDriveCardConfig["tap_action"]> = { action };
  copyStringProperty(value, config, "entity");
  if (action === "navigate") {
    copyStringProperty(value, config, "navigation_path");
  }
  if (action === "url") {
    copyStringProperty(value, config, "url_path");
  }
  if (action === "call-service") {
    config.action = "perform-action";
    copyStringProperty(value, config, "perform_action", value.service ?? value.perform_action);
    copyPlainObjectProperty(value, config, "target");
    copyPlainObjectProperty(value, config, "data");
  }
  return config;
}

export function targetFieldToString(
  target: unknown,
  field: ActionTargetField,
): string {
  if (!isPlainObject(target)) {
    return "";
  }
  const value = target[field];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").join(", ");
  }
  return "";
}

export function updateActionTargetField(
  target: unknown,
  field: ActionTargetField,
  rawValue: string | undefined,
): Record<string, unknown> | undefined {
  const next = isPlainObject(target) ? { ...target } : {};
  const values = splitTargetValues(rawValue ?? "");
  if (values.length) {
    next[field] = values.length === 1 ? values[0] : values;
  } else {
    delete next[field];
  }
  return Object.keys(next).length ? next : undefined;
}

export function formatActionData(data: unknown): string {
  return isPlainObject(data) ? JSON.stringify(data, null, 2) : "";
}

export function parseActionData(value: string): ParsedActionData {
  if (!value.trim()) {
    return { valid: true };
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isPlainObject(parsed)) {
      return { valid: false };
    }
    return { valid: true, value: parsed };
  } catch {
    return { valid: false };
  }
}

function copyStringProperty(
  source: Record<string, unknown>,
  target: NonNullable<UnifiDriveCardConfig["tap_action"]>,
  property: string,
  sourceValue = source[property],
): void {
  const value = sourceValue;
  if (typeof value === "string" && value.trim()) {
    target[property] = value.trim();
  }
}

function copyPlainObjectProperty(
  source: Record<string, unknown>,
  target: NonNullable<UnifiDriveCardConfig["tap_action"]>,
  property: string,
): void {
  const value = source[property];
  if (isPlainObject(value) && Object.keys(value).length) {
    target[property] = { ...value };
  }
}

function splitTargetValues(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isEditorActionName(value: unknown): value is EditorActionName {
  return typeof value === "string" && ACTION_OPTIONS.includes(value as EditorActionName);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
