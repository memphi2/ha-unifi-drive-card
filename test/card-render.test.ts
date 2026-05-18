import { describe, expect, it, vi } from "vitest";
import { UnifiDriveCard } from "../src/unifi-drive-card";
import type { HomeAssistant } from "../src/types";

describe("UnifiDriveCard rendering", () => {
  it("renders aggregate storage, dynamic groups and hides dangerous actions by default", async () => {
    const card = await renderCard(hassFixture(), {
      sections: ["overview", "pools", "drives", "snapshots", "system"],
    });
    const rendered = visibleText(card);

    expect(rendered).toContain("UniFi Drive");
    expect(rendered).toContain("Usage");
    expect(rendered).toContain("Pool 1");
    expect(rendered).toContain("Disk 1");
    expect(rendered).toContain("Shared");
    expect(rendered).toContain("Fan mode");
    expect(rendered).not.toContain("Shut down");
  });

  it("shows dangerous system actions only when explicitly enabled", async () => {
    const card = await renderCard(hassFixture(), {
      sections: ["system"],
      show_dangerous_actions: true,
    });

    expect(visibleText(card)).toContain("Shut down");
  });

  it("dispatches Home Assistant actions from entity rows", async () => {
    const card = await renderCard(hassFixture(), {
      sections: ["overview"],
      tap_action: { action: "more-info" },
    });
    const actionSpy = vi.fn();
    card.addEventListener("hass-action", actionSpy);
    const row = card.shadowRoot?.querySelector(".metric.entity-action") as HTMLButtonElement;
    row.click();
    await new Promise((resolve) => window.setTimeout(resolve, 300));

    expect(actionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          action: "tap",
          config: expect.objectContaining({ entity: "sensor.system_status" }),
        }),
      }),
    );
  });

  it("calls HA services for row controls", async () => {
    const hass = hassFixture();
    const card = await renderCard(hass, {
      sections: ["snapshots"],
    });
    const button = [...(card.shadowRoot?.querySelectorAll("button.chip") ?? [])].find((item) =>
      item.textContent?.includes("On"),
    ) as HTMLButtonElement;
    button.click();
    await card.updateComplete;

    expect(hass.callService).toHaveBeenCalledWith("switch", "turn_off", {
      entity_id: "switch.snapshots",
    });
  });

  it("renders precise time controls and numeric bounds", async () => {
    const card = await renderCard(hassFixture(), {
      sections: ["snapshots"],
    });
    const number = card.shadowRoot?.querySelector("input.number") as HTMLInputElement;
    const time = card.shadowRoot?.querySelector("input.time") as HTMLInputElement;

    expect(number.getAttribute("min")).toBe("1");
    expect(number.getAttribute("max")).toBe("8");
    expect(number.getAttribute("step")).toBe("2");
    expect(time.getAttribute("step")).toBe("1");
  });

  it("provides a stub config from UniFi Drive entities", () => {
    const config = UnifiDriveCard.getStubConfig(hassFixture());
    expect(config).toEqual({
      type: "custom:unifi-drive-card",
      entity: "sensor.system_status",
    });
  });

  it("uses the compact layout by default and can disable it explicitly", async () => {
    const compactCard = await renderCard(hassFixture(), { sections: ["overview"] });
    expect(compactCard.getCardSize()).toBe(5);
    expect(compactCard.shadowRoot?.querySelector("ha-card")?.classList.contains("compact")).toBe(
      true,
    );

    const fullCard = await renderCard(hassFixture(), {
      compact: false,
      sections: ["overview"],
    });
    expect(fullCard.getCardSize()).toBe(9);
    expect(fullCard.shadowRoot?.querySelector("ha-card")?.classList.contains("compact")).toBe(
      false,
    );
  });

  it("marks sections and row lists for responsive wide layouts", async () => {
    const card = await renderCard(hassFixture(), {
      sections: ["overview", "storage", "pools", "drives", "snapshots"],
    });

    expect(card.shadowRoot?.querySelector(".content-grid > .card-section")).toBeTruthy();
    expect(card.shadowRoot?.querySelector('[data-section="overview"]')).toBeTruthy();
    expect(card.shadowRoot?.querySelector('[data-section="storage"] .entity-list')).toBeTruthy();
    expect(card.shadowRoot?.querySelector('[data-section="pools"] .group-grid')).toBeTruthy();
    expect(card.shadowRoot?.querySelector(".group-card .group-rows")).toBeTruthy();
  });

  it("uses configured section order as the rendered content order", async () => {
    const card = await renderCard(hassFixture(), {
      sections: ["system", "overview", "storage"],
    });
    const sections = [...(card.shadowRoot?.querySelectorAll(".content-grid > .card-section") ?? [])];

    expect(sections.map((section) => section.getAttribute("data-section"))).toEqual([
      "system",
      "overview",
      "storage",
    ]);
  });

  it("renders configured overview entities in order", async () => {
    const card = await renderCard(hassFixture(), {
      sections: ["overview"],
      overview_entities: ["used_storage", "usage_percent"],
    });
    const metrics = [...(card.shadowRoot?.querySelectorAll(".metric") ?? [])];

    expect(metrics).toHaveLength(2);
    expect(metrics[0]?.textContent).toContain("Used Storage");
    expect(metrics[1]?.textContent).toContain("Usage");
    expect(visibleText(card)).not.toContain("System Status");
  });

  it("colors problem tiles by current state", async () => {
    const healthyCard = await renderCard(hassFixture(), {
      sections: ["overview"],
      overview_entities: ["storage_problem"],
    });
    const healthyIcon = healthyCard.shadowRoot?.querySelector(".metric .icon-bubble") as HTMLElement;
    const healthyHeaderIcon = healthyCard.shadowRoot?.querySelector("header .icon-bubble") as HTMLElement;

    expect(healthyIcon.className).toContain("ok");
    expect(healthyIcon.className).not.toContain("alert");
    expect(healthyIcon.className).not.toContain("animated");
    expect(healthyHeaderIcon.className).toContain("ok");
    expect(healthyHeaderIcon.className).not.toContain("alert");
    expect(healthyHeaderIcon.className).not.toContain("animated");

    const failing = hassFixture();
    failing.states["binary_sensor.problem"] = entity("on", {
      friendly_name: "UniFi Drive Storage Problem",
    });
    const failingCard = await renderCard(failing, {
      sections: ["overview"],
      overview_entities: ["storage_problem"],
    });
    const failingIcon = failingCard.shadowRoot?.querySelector(".metric .icon-bubble") as HTMLElement;
    const failingHeaderIcon = failingCard.shadowRoot?.querySelector("header .icon-bubble") as HTMLElement;

    expect(failingIcon.className).toContain("alert");
    expect(failingIcon.className).toContain("animated");
    expect(failingHeaderIcon.className).toContain("alert");
    expect(failingHeaderIcon.className).toContain("animated");

    const unknown = hassFixture();
    unknown.states["binary_sensor.problem"] = entity("unknown", {
      friendly_name: "UniFi Drive Storage Problem",
    });
    const unknownCard = await renderCard(unknown, {
      sections: ["overview"],
      overview_entities: ["storage_problem"],
    });
    const unknownIcon = unknownCard.shadowRoot?.querySelector(".metric .icon-bubble") as HTMLElement;
    const unknownHeaderIcon = unknownCard.shadowRoot?.querySelector("header .icon-bubble") as HTMLElement;

    expect(unknownIcon.className).toContain("neutral");
    expect(unknownIcon.className).not.toContain("ok");
    expect(unknownHeaderIcon.className).toContain("neutral");
    expect(unknownHeaderIcon.className).not.toContain("ok");

    const unavailable = hassFixture();
    unavailable.states["binary_sensor.problem"] = entity("unavailable", {
      friendly_name: "UniFi Drive Storage Problem",
    });
    const unavailableCard = await renderCard(unavailable, {
      sections: ["overview"],
      overview_entities: ["storage_problem"],
      show_unavailable: true,
    });
    const unavailableHeaderIcon = unavailableCard.shadowRoot?.querySelector("header .icon-bubble") as HTMLElement;

    expect(unavailableHeaderIcon.className).toContain("alert");
    expect(unavailableHeaderIcon.className).not.toContain("animated");
  });

  it("can render DHE-style display tiles for dense sections", async () => {
    const card = await renderCard(hassFixture(), {
      sections: ["storage"],
      show_display_buttons: true,
    });

    expect(card.shadowRoot?.querySelector('[data-section="storage"] .display-button-grid')).toBeTruthy();
    expect(card.shadowRoot?.querySelectorAll(".display-button-tile")).toHaveLength(2);
  });
});

async function renderCard(hass: HomeAssistant, config: Record<string, unknown>) {
  const card = new UnifiDriveCard();
  card.hass = hass;
  card.setConfig({ type: "custom:unifi-drive-card", ...config });
  document.body.append(card);
  await card.updateComplete;
  return card;
}

function visibleText(element: Element): string {
  return (element.shadowRoot?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function hassFixture(): HomeAssistant {
  const states = {
    "sensor.system_status": entity("online", { friendly_name: "UniFi Drive System Status" }),
    "sensor.usage": entity("42", {
      friendly_name: "UniFi Drive Storage Usage",
      unit_of_measurement: "%",
    }),
    "sensor.used": entity("420", {
      friendly_name: "UniFi Drive Used Storage",
      unit_of_measurement: "GiB",
    }),
    "binary_sensor.problem": entity("off", {
      friendly_name: "UniFi Drive Storage Problem",
    }),
    "sensor.pool_status": entity("healthy", {
      pool_key: "pool-1",
      pool_name: "Pool 1",
      friendly_name: "Pool 1 Status",
    }),
    "sensor.drive_temperature": entity("31", {
      drive_key: "pool-1_sda",
      drive_name: "Disk 1",
      unit_of_measurement: "°C",
    }),
    "switch.snapshots": entity("on", {
      target_key: "shared_main",
      target_name: "Shared",
      target_type: "shared",
    }),
    "number.snapshot_limit": entity("7", {
      target_key: "shared_main",
      target_name: "Shared",
      target_type: "shared",
      min: 1,
      max: 8,
      step: 2,
    }),
    "time.snapshot_time": entity("02:30:45", {
      target_key: "shared_main",
      target_name: "Shared",
      target_type: "shared",
    }),
    "select.fan": entity("Balance", {
      friendly_name: "Fan mode",
      options: ["Quiet", "Balance", "Cooling"],
    }),
    "button.shutdown": entity("unknown", { friendly_name: "Shut down" }),
  };
  return {
    states,
    entities: {
      "sensor.system_status": registry("system_status"),
      "sensor.usage": registry("usage_percent"),
      "sensor.used": registry("used_storage"),
      "binary_sensor.problem": registry("storage_problem"),
      "sensor.pool_status": registry("pool_status"),
      "sensor.drive_temperature": registry("drive_temperature"),
      "switch.snapshots": registry("snapshot_enabled"),
      "number.snapshot_limit": registry("snapshot_limit"),
      "time.snapshot_time": registry("snapshot_schedule_time"),
      "select.fan": registry("fan_mode"),
      "button.shutdown": registry("shutdown"),
    },
    callService: vi.fn(async () => undefined),
  };
}

function entity(state: string, attributes: Record<string, unknown>) {
  return { state, attributes };
}

function registry(translationKey: string) {
  return {
    platform: "unifi_drive",
    device_id: "dev-a",
    config_entry_id: "entry-a",
    translation_key: translationKey,
    unique_id: `dev-a_${translationKey}`,
  };
}
