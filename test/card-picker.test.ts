import { describe, expect, it } from "vitest";
import {
  unifiDriveCardRegistration,
  unifiDriveEntitySuggestion,
} from "../src/card-picker";
import type { HomeAssistant } from "../src/types";

describe("unifiDriveEntitySuggestion", () => {
  it("registers the card with documentation and entity suggestions", () => {
    expect(unifiDriveCardRegistration).toMatchObject({
      type: "unifi-drive-card",
      documentationURL: "https://github.com/memphi2/ha-unifi-drive-card",
      getEntitySuggestion: unifiDriveEntitySuggestion,
    });
  });

  it("suggests a device-scoped card for a UniFi Drive entity", () => {
    const suggestion = unifiDriveEntitySuggestion(
      hass({
        "sensor.unas_usage": { platform: "unifi_unas", device_id: "device-a" },
      }),
      "sensor.unas_usage",
    );

    expect(suggestion).toEqual({
      config: { type: "custom:unifi-drive-card", device_id: "device-a" },
    });
  });

  it("does not suggest the card for unrelated or device-less entities", () => {
    const homeAssistant = hass({
      "sensor.other_usage": { platform: "other", device_id: "device-a" },
      "sensor.unas_orphan": { platform: "unifi_unas" },
    });

    expect(unifiDriveEntitySuggestion(homeAssistant, "sensor.other_usage")).toBeNull();
    expect(unifiDriveEntitySuggestion(homeAssistant, "sensor.unas_orphan")).toBeNull();
    expect(unifiDriveEntitySuggestion(homeAssistant, "sensor.unknown")).toBeNull();
  });
});

function hass(entities: NonNullable<HomeAssistant["entities"]>): HomeAssistant {
  return {
    states: {},
    entities,
    callService: async () => undefined,
  };
}
