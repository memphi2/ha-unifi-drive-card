import { describe, expect, it } from "vitest";
import { DEFAULT_SECTIONS } from "../src/catalog";
import { normalizeConfig } from "../src/config";
import { OVERVIEW_KEYS } from "../src/entity-groups";

describe("normalizeConfig", () => {
  it("provides stable UniFi Drive defaults", () => {
    const config = normalizeConfig({});
    expect(config.type).toBe("custom:unifi-drive-card");
    expect(config.sections).toEqual(DEFAULT_SECTIONS);
    expect(config.show_diagnostics).toBe(true);
    expect(config.show_icon_animations).toBe(true);
    expect(config.show_dangerous_actions).toBe(false);
    expect(config.compact).toBe(true);
    expect(config.tap_action).toEqual({ action: "more-info" });
    expect(config.overview_columns).toBe(3);
    expect(config.overview_entities).toEqual(OVERVIEW_KEYS);
    expect(config.show_display_buttons).toBe(false);
  });

  it("allows compact mode to be disabled explicitly", () => {
    const config = normalizeConfig({ compact: false });
    expect(config.compact).toBe(false);
  });

  it("does not keep the removed legacy entity anchor option", () => {
    const config = normalizeConfig({
      entity: "sensor.legacy_anchor",
    } as Parameters<typeof normalizeConfig>[0] & { entity: string });

    expect("entity" in config).toBe(false);
  });

  it("bounds overview columns like the DHE card", () => {
    expect(normalizeConfig({ overview_columns: 0 }).overview_columns).toBe(1);
    expect(normalizeConfig({ overview_columns: 4 }).overview_columns).toBe(4);
    expect(normalizeConfig({ overview_columns: 12 }).overview_columns).toBe(6);
    expect(normalizeConfig({ overview_columns: 2.5 }).overview_columns).toBe(3);
  });

  it("filters invalid sections", () => {
    const config = normalizeConfig({
      sections: ["overview", "storage", "overview", "invalid" as "overview"],
    });
    expect(config.sections).toEqual(["overview", "storage"]);
  });

  it("filters and deduplicates overview entities without restoring defaults", () => {
    const config = normalizeConfig({
      overview_entities: [
        "usage_percent",
        "pool_status",
        "invalid",
        "usage_percent",
        "system_status",
      ],
    });

    expect(config.overview_entities).toEqual(["usage_percent", "system_status"]);
  });

  it("preserves Mushroom-style action configs", () => {
    const config = normalizeConfig({
      tap_action: { action: "toggle" },
      hold_action: { action: "navigate", navigation_path: "/lovelace/unifi-drive" },
      double_tap_action: { action: "more-info", entity: "sensor.custom" },
    });

    expect(config.tap_action).toEqual({ action: "toggle" });
    expect(config.hold_action).toEqual({
      action: "navigate",
      navigation_path: "/lovelace/unifi-drive",
    });
    expect(config.double_tap_action).toEqual({
      action: "more-info",
      entity: "sensor.custom",
    });
  });
});
