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

  it("provides a stub config from UniFi Drive entities", () => {
    const config = UnifiDriveCard.getStubConfig(hassFixture());
    expect(config).toEqual({
      type: "custom:unifi-drive-card",
      entity: "sensor.system_status",
    });
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
