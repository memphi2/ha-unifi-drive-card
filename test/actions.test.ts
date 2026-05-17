import { describe, expect, it, vi } from "vitest";
import { installUpdate, selectOption, setNumberValue, setTimeValue } from "../src/actions";
import type { HomeAssistant } from "../src/types";

describe("actions", () => {
  it("rounds number values to the entity step", async () => {
    const hass = mockHass();
    await setNumberValue(
      hass,
      "number.snapshot_limit",
      { state: "32", attributes: { min: 1, max: 256, step: 1 } },
      "32.7",
    );
    expect(hass.callService).toHaveBeenCalledWith("number", "set_value", {
      entity_id: "number.snapshot_limit",
      value: 33,
    });
  });

  it("rounds number values from the entity minimum", async () => {
    const hass = mockHass();
    await setNumberValue(
      hass,
      "number.snapshot_limit",
      { state: "1", attributes: { min: 1, max: 9, step: 2 } },
      "2.2",
    );
    expect(hass.callService).toHaveBeenCalledWith("number", "set_value", {
      entity_id: "number.snapshot_limit",
      value: 3,
    });
  });

  it("ignores invalid number input", async () => {
    const hass = mockHass();
    await setNumberValue(hass, "number.snapshot_limit", undefined, "");
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it("uses Home Assistant select and time service payloads", async () => {
    const hass = mockHass();
    await selectOption(hass, "select.fan_mode", "Balance");
    await setTimeValue(hass, "time.snapshot_schedule", "02:30");
    expect(hass.callService).toHaveBeenNthCalledWith(1, "select", "select_option", {
      entity_id: "select.fan_mode",
      option: "Balance",
    });
    expect(hass.callService).toHaveBeenNthCalledWith(2, "time", "set_value", {
      entity_id: "time.snapshot_schedule",
      time: "02:30",
    });
  });

  it("preserves seconds for time service payloads", async () => {
    const hass = mockHass();
    await setTimeValue(hass, "time.snapshot_schedule", "02:30:45");
    expect(hass.callService).toHaveBeenCalledWith("time", "set_value", {
      entity_id: "time.snapshot_schedule",
      time: "02:30:45",
    });
  });

  it("routes update installs through the update domain", async () => {
    const hass = mockHass();
    await installUpdate(hass, "update.unifi_os");
    expect(hass.callService).toHaveBeenCalledWith("update", "install", {
      entity_id: "update.unifi_os",
    });
  });
});

function mockHass(): HomeAssistant {
  return {
    states: {},
    callService: vi.fn(async () => undefined),
  };
}
