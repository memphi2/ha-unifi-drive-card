import { describe, expect, it } from "vitest";
import { actionEventConfig, actionForTrigger, isActionEnabled } from "../src/card-actions";
import { normalizeConfig } from "../src/config";

describe("card action helpers", () => {
  it("treats action none as disabled for gesture routing", () => {
    const config = normalizeConfig({
      hold_action: { action: "none" },
      double_tap_action: { action: "none" },
    });

    expect(isActionEnabled(config.hold_action)).toBe(false);
    expect(isActionEnabled(config.double_tap_action)).toBe(false);
    expect(actionForTrigger(config, "hold", "sensor.system_status")).toBeUndefined();
    expect(actionForTrigger(config, "double_tap", "sensor.system_status")).toBeUndefined();
    expect(actionEventConfig(config, "tap", "sensor.system_status")).toEqual({
      entity: "sensor.system_status",
      tap_action: { action: "more-info", entity: "sensor.system_status" },
    });
  });
});
