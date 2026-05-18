import { booleanState, isUnavailable, normalizeDisplayText } from "./format";
import { localize } from "./i18n";
import type { HassEntity, HomeAssistant } from "./types";

interface HeaderStatusInput {
  system?: HassEntity;
  storage?: HassEntity;
  problem?: HassEntity;
  hasBaseEntity: boolean;
}

export function headerStatusText(
  hass: HomeAssistant | undefined,
  input: HeaderStatusInput,
): string {
  if (input.problem && !isUnavailable(input.problem) && booleanState(input.problem)) {
    return localize(hass, "status.problem", {
      state: normalizeDisplayText(input.problem.state) || localize(hass, "button.on"),
    });
  }

  const system = statusStateText(hass, input.system);
  if (system) {
    return localize(hass, "status.status", { state: system });
  }

  const storage = statusStateText(hass, input.storage);
  if (storage) {
    return localize(hass, "status.status", { state: storage });
  }

  return input.hasBaseEntity
    ? localize(hass, "status.discovered")
    : localize(hass, "status.select_entity");
}

function statusStateText(
  hass: HomeAssistant | undefined,
  state: HassEntity | undefined,
): string | undefined {
  if (!state || isUnavailable(state)) {
    return undefined;
  }
  return normalizeDisplayText(state.state) || localize(hass, "state.unknown");
}
