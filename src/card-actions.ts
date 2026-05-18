import type { ActionConfig, NormalizedUnifiDriveCardConfig } from "./types";

export type ActionTrigger = "tap" | "hold" | "double_tap";

export const HOLD_ACTION_DELAY_MS = 500;
export const DOUBLE_TAP_DELAY_MS = 250;

const ACTION_CONFIG_KEY: Record<
  ActionTrigger,
  "tap_action" | "hold_action" | "double_tap_action"
> = {
  tap: "tap_action",
  hold: "hold_action",
  double_tap: "double_tap_action",
};

export const DEFAULT_TAP_ACTION: ActionConfig = { action: "more-info" };

export function normalizeActionConfig(value: unknown): ActionConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return { ...value };
}

export function isActionEnabled(action: ActionConfig | undefined): action is ActionConfig {
  return Boolean(action && action.action !== "none");
}

export function actionForTrigger(
  config: NormalizedUnifiDriveCardConfig,
  trigger: ActionTrigger,
  entityId: string,
): ActionConfig | undefined {
  const action = config[ACTION_CONFIG_KEY[trigger]];
  if (!isActionEnabled(action)) {
    return undefined;
  }
  return typeof action.entity === "string" ? { ...action } : { ...action, entity: entityId };
}

export function actionEventConfig(
  config: NormalizedUnifiDriveCardConfig,
  trigger: ActionTrigger,
  entityId: string,
): Record<string, unknown> | undefined {
  const activeAction = actionForTrigger(config, trigger, entityId);
  if (!activeAction) {
    return undefined;
  }
  const targetEntity =
    typeof activeAction.entity === "string" ? activeAction.entity : entityId;
  const eventConfig: Record<string, unknown> = { entity: targetEntity };
  for (const actionTrigger of ["tap", "hold", "double_tap"] as const) {
    const action = actionForTrigger(config, actionTrigger, entityId);
    if (action) {
      eventConfig[ACTION_CONFIG_KEY[actionTrigger]] = action;
    }
  }
  return eventConfig;
}
