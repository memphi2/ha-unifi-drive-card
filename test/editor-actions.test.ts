import { describe, expect, it } from "vitest";
import {
  actionConfigFromEditor,
  actionNameFromConfig,
  formatActionData,
  parseActionData,
  targetFieldToString,
  updateActionTargetField,
} from "../src/editor-actions";

describe("editor action helpers", () => {
  it("maps current Home Assistant perform-action configs to call-service controls", () => {
    expect(actionNameFromConfig({ action: "perform-action" }, "tap_action")).toBe(
      "call-service",
    );
    expect(
      actionConfigFromEditor("tap_action", {
        action: "call-service",
        service: "light.turn_on",
        target: { entity_id: "light.bathroom" },
        data: { brightness_pct: 75 },
      }),
    ).toEqual({
      action: "perform-action",
      perform_action: "light.turn_on",
      target: { entity_id: "light.bathroom" },
      data: { brightness_pct: 75 },
    });
  });

  it("normalizes target fields and validates service data JSON", () => {
    const target = updateActionTargetField(undefined, "area_id", "bathroom, wellness");

    expect(target).toEqual({ area_id: ["bathroom", "wellness"] });
    expect(targetFieldToString(target, "area_id")).toBe("bathroom, wellness");
    expect(formatActionData({ force: true })).toBe('{\n  "force": true\n}');
    expect(parseActionData('{"force":true}')).toEqual({
      valid: true,
      value: { force: true },
    });
    expect(parseActionData("[1]")).toEqual({ valid: false });
  });
});
