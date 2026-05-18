import { describe, expect, it } from "vitest";
import { ENTITY_DEFINITION_BY_KEY } from "../src/catalog";
import { iconVisualClass, iconVisualState } from "../src/icon-visuals";
import type { EntityDefinition, HassEntity } from "../src/types";

describe("icon visuals", () => {
  it("renders problem entities green and still when healthy", () => {
    const visual = iconVisualState(definition("storage_problem"), entity("off"));
    const className = iconVisualClass(definition("storage_problem"), entity("off"));

    expect(visual).toMatchObject({
      tone: "ok",
      active: true,
      animated: false,
    });
    expect(className).toContain("ok");
    expect(className).not.toContain("alert");
    expect(className).not.toContain("animated");
  });

  it("renders problem entities red and animated when active", () => {
    const visual = iconVisualState(definition("storage_problem"), entity("on"));
    const className = iconVisualClass(definition("storage_problem"), entity("on"));

    expect(visual).toMatchObject({
      tone: "alert",
      motion: "alert",
      active: true,
      animated: true,
    });
    expect(className).toContain("alert");
    expect(className).toContain("motion-alert");
    expect(className).toContain("animated");
  });

  it("renders unavailable problem entities red without motion", () => {
    const visual = iconVisualState(definition("storage_problem"), entity("unavailable"));
    const className = iconVisualClass(definition("storage_problem"), entity("unavailable"));

    expect(visual).toMatchObject({
      tone: "alert",
      active: false,
      animated: false,
    });
    expect(className).toContain("alert");
    expect(className).not.toContain("animated");
  });

  it("renders unknown problem entities neutral instead of healthy", () => {
    const visual = iconVisualState(definition("storage_problem"), entity("unknown"));
    const className = iconVisualClass(definition("storage_problem"), entity("unknown"));

    expect(visual).toMatchObject({
      tone: "neutral",
      active: false,
      animated: false,
    });
    expect(className).toContain("neutral");
    expect(className).not.toContain("ok");
    expect(className).not.toContain("alert");
  });

  it("renders zero attention counters green and non-zero counters red", () => {
    expect(iconVisualState(definition("degraded_pool_count"), entity("0"))).toMatchObject({
      tone: "ok",
      active: true,
      animated: false,
    });
    expect(iconVisualState(definition("degraded_pool_count"), entity("1"))).toMatchObject({
      tone: "alert",
      active: true,
      animated: true,
    });
  });

  it("uses health colors for status sensors", () => {
    expect(iconVisualState(definition("system_status"), entity("online"))).toMatchObject({
      tone: "ok",
      active: true,
      animated: false,
    });
    expect(iconVisualState(definition("overall_status"), entity("degraded"))).toMatchObject({
      tone: "alert",
      active: true,
      animated: true,
    });
  });

  it("keeps routine metrics calm and only animates active throughput", () => {
    expect(iconVisualState(definition("usage_percent"), entity("42"))).toMatchObject({
      tone: "storage",
      active: true,
      animated: false,
    });
    expect(iconVisualState(definition("read_throughput"), entity("0"))).toMatchObject({
      tone: "network",
      active: true,
      animated: false,
    });
    expect(iconVisualState(definition("read_throughput"), entity("12.5"))).toMatchObject({
      tone: "network",
      active: true,
      animated: true,
    });
  });

  it("renders update entities green when clear and animated when available", () => {
    expect(iconVisualState(definition("drive_update"), entity("off"))).toMatchObject({
      tone: "ok",
      active: true,
      animated: false,
    });
    expect(iconVisualState(definition("drive_update"), entity("unknown"))).toMatchObject({
      tone: "neutral",
      active: false,
      animated: false,
    });
    expect(iconVisualState(definition("drive_update"), entity("on"))).toMatchObject({
      tone: "update",
      active: true,
      animated: true,
    });
  });
});

function entity(state: string): HassEntity {
  return { state, attributes: {} };
}

function definition(key: string): EntityDefinition {
  const found = ENTITY_DEFINITION_BY_KEY[key];
  if (!found) {
    throw new Error(`missing entity definition: ${key}`);
  }
  return found;
}
