import { INTEGRATION_DOMAIN, type HomeAssistant, type UnifiDriveCardConfig } from "./types";

export interface CardPickerSuggestion {
  config: UnifiDriveCardConfig;
}

export interface CustomCardRegistration {
  type: string;
  name: string;
  description?: string;
  preview?: boolean;
  documentationURL?: string;
  getEntitySuggestion?: (
    hass: HomeAssistant,
    entityId: string,
  ) => CardPickerSuggestion | null;
}

export function unifiDriveEntitySuggestion(
  hass: HomeAssistant,
  entityId: string,
): CardPickerSuggestion | null {
  const registry = hass.entities?.[entityId];
  if (registry?.platform !== INTEGRATION_DOMAIN || !registry.device_id) {
    return null;
  }

  return {
    config: {
      type: "custom:unifi-drive-card",
      device_id: registry.device_id,
    },
  };
}

export const unifiDriveCardRegistration: CustomCardRegistration = {
  type: "unifi-drive-card",
  name: "Drive Storage Card",
  description: "Mushroom-style card for Home Assistant's unifi_unas integration",
  preview: true,
  documentationURL: "https://github.com/memphi2/ha-unifi-drive-card",
  getEntitySuggestion: unifiDriveEntitySuggestion,
};
