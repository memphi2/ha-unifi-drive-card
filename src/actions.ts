import { numericAttribute, parseFiniteNumber, roundToStepWithinBounds } from "./format";
import type { HassEntity, HomeAssistant } from "./types";

const TIME_VALUE_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export function serviceForToggle(state: HassEntity | undefined): "turn_on" | "turn_off" {
  return state?.state === "on" ? "turn_off" : "turn_on";
}

export async function callEntityService(
  hass: HomeAssistant,
  entityId: string,
  service: string,
  data: Record<string, unknown> = {},
): Promise<unknown> {
  const normalizedEntityId = entityId.trim();
  const [domain, objectId] = normalizedEntityId.split(".", 2);
  if (!domain || !objectId) {
    return undefined;
  }
  return hass.callService(domain, service, { entity_id: normalizedEntityId, ...data });
}

export async function setNumberValue(
  hass: HomeAssistant,
  entityId: string,
  state: HassEntity | undefined,
  rawValue: string | number,
): Promise<unknown> {
  const parsed = parseFiniteNumber(rawValue);
  if (parsed === undefined) {
    return undefined;
  }
  const min = numericAttribute(state, "min");
  const max = numericAttribute(state, "max");
  const step = numericAttribute(state, "step") ?? 1;
  const value = roundToStepWithinBounds(parsed, step, min, max);
  return callEntityService(hass, entityId, "set_value", { value });
}

export async function selectOption(
  hass: HomeAssistant,
  entityId: string,
  option: string,
): Promise<unknown> {
  if (option.length === 0) {
    return undefined;
  }
  return callEntityService(hass, entityId, "select_option", { option });
}

export async function setTimeValue(
  hass: HomeAssistant,
  entityId: string,
  value: string,
): Promise<unknown> {
  if (!TIME_VALUE_PATTERN.test(value)) {
    return undefined;
  }
  return callEntityService(hass, entityId, "set_value", { time: value });
}

export async function installUpdate(
  hass: HomeAssistant,
  entityId: string,
): Promise<unknown> {
  return hass.callService("update", "install", { entity_id: entityId });
}
