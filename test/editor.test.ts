import { describe, expect, it, vi } from "vitest";
import "../src/editor";
import type { UnifiDriveCardEditor } from "../src/editor";

describe("UnifiDriveCardEditor", () => {
  it("renders compact defaults and advanced action controls", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    editor.setConfig({ device_id: "device-a", max_sensor_rows: 4, overview_columns: 4 });
    document.body.append(editor);
    await editor.updateComplete;

    const text = editor.shadowRoot?.textContent ?? "";
    const compact = [...(editor.shadowRoot?.querySelectorAll(".check") ?? [])].find((item) =>
      item.textContent?.includes("Compact"),
    );

    expect(text).toContain("Device and layout");
    expect(text).toContain("Device");
    expect(text).toContain("Overview columns");
    expect(text).toContain("Max sensor rows");
    expect(text).toContain("Icon animations");
    expect(text).toContain("Display tiles");
    expect(text).toContain("Sections");
    expect(text).toContain("Overview tiles");
    expect(text).toContain("Tap action");
    expect(text).toContain("Hold action");
    expect(text).toContain("Entities");
    const compactSwitch = compact?.querySelector("ha-switch") as
      | (HTMLElement & { checked?: boolean })
      | null;
    expect(compactSwitch?.checked).toBe(true);
    expect(text).not.toContain("storage_problem");
  });

  it("uses Home Assistant pickers for device and anchor selection", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);
    editor.setConfig({ device_id: "device-a", entity: "sensor.system_status" });
    document.body.append(editor);
    await editor.updateComplete;

    const devicePicker = editor.shadowRoot?.querySelector(
      ".basic-editor ha-device-picker",
    ) as HTMLElement & {
      helper?: string;
      includeDomains?: string[];
      label?: string;
      value?: string;
    };
    const entityPicker = editor.shadowRoot?.querySelector(
      ".basic-editor ha-entity-picker",
    ) as HTMLElement & { includeDomains?: string[]; label?: string; value?: string };

    expect(devicePicker.value).toBe("device-a");
    expect(devicePicker.label).toBe("Device");
    expect(devicePicker.helper).toContain("Home Assistant device");
    expect(devicePicker.includeDomains).toContain("sensor");
    expect(devicePicker.includeDomains).toContain("update");
    expect(entityPicker.value).toBe("sensor.system_status");
    expect(entityPicker.label).toBe("Anchor entity");

    devicePicker.dispatchEvent(
      new CustomEvent("device-picked", {
        detail: { device_id: "device-b" },
      }),
    );
    await editor.updateComplete;

    const config = (listener.mock.calls.at(-1)?.[0] as CustomEvent).detail.config;
    expect(config.device_id).toBe("device-b");
  });

  it("keeps default action rows collapsed until configured", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    document.body.append(editor);
    await editor.updateComplete;

    const tap = editor.shadowRoot?.querySelector(
      '[data-action-card-key="tap_action"]',
    ) as HTMLDetailsElement;
    const hold = editor.shadowRoot?.querySelector(
      '[data-action-card-key="hold_action"]',
    ) as HTMLDetailsElement;
    const doubleTap = editor.shadowRoot?.querySelector(
      '[data-action-card-key="double_tap_action"]',
    ) as HTMLDetailsElement;

    expect(tap.open).toBe(false);
    expect(hold.open).toBe(false);
    expect(doubleTap.open).toBe(false);
  });

  it("opens action rows when they contain custom action configuration", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    editor.setConfig({
      tap_action: { action: "toggle" },
      hold_action: { action: "navigate", navigation_path: "/lovelace/unifi-drive" },
    });
    document.body.append(editor);
    await editor.updateComplete;

    const tap = editor.shadowRoot?.querySelector(
      '[data-action-card-key="tap_action"]',
    ) as HTMLDetailsElement;
    const hold = editor.shadowRoot?.querySelector(
      '[data-action-card-key="hold_action"]',
    ) as HTMLDetailsElement;
    const doubleTap = editor.shadowRoot?.querySelector(
      '[data-action-card-key="double_tap_action"]',
    ) as HTMLDetailsElement;

    expect(tap.open).toBe(true);
    expect(hold.open).toBe(true);
    expect(doubleTap.open).toBe(false);
  });

  it("reorders sections through the DHE-style section editor", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);
    editor.setConfig({ sections: ["overview", "storage", "system"] });
    document.body.append(editor);
    await editor.updateComplete;

    const overviewDown = editor.shadowRoot?.querySelector(
      '[data-section-key="overview"] button[aria-label="Move down"]',
    ) as HTMLButtonElement;
    overviewDown.click();
    await editor.updateComplete;

    const config = (listener.mock.calls.at(-1)?.[0] as CustomEvent).detail.config;
    expect(config.sections).toEqual(["storage", "overview", "system"]);
  });

  it("drops moved sections at the target row instead of after it", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);
    editor.setConfig({ sections: ["overview", "storage", "system"] });
    document.body.append(editor);
    await editor.updateComplete;

    const systemRow = editor.shadowRoot?.querySelector(
      '[data-section-key="system"]',
    ) as HTMLElement;
    systemRow.dispatchEvent(
      dropEvent("application/x-unifi-drive-section", "overview"),
    );
    await editor.updateComplete;

    const config = (listener.mock.calls.at(-1)?.[0] as CustomEvent).detail.config;
    expect(config.sections).toEqual(["storage", "overview", "system"]);
  });

  it("reorders overview tiles through the overview entity editor", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);
    editor.setConfig({ overview_entities: ["usage_percent", "used_storage"] });
    document.body.append(editor);
    await editor.updateComplete;

    const usageDown = editor.shadowRoot?.querySelector(
      '[data-overview-key="usage_percent"] button[aria-label="Move down"]',
    ) as HTMLButtonElement;
    usageDown.click();
    await editor.updateComplete;

    const config = (listener.mock.calls.at(-1)?.[0] as CustomEvent).detail.config;
    expect(config.overview_entities).toEqual(["used_storage", "usage_percent"]);
  });

  it("drops moved overview tiles at the target row instead of after it", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);
    editor.setConfig({
      overview_entities: ["usage_percent", "used_storage", "overall_status"],
    });
    document.body.append(editor);
    await editor.updateComplete;

    const statusRow = editor.shadowRoot?.querySelector(
      '[data-overview-key="overall_status"]',
    ) as HTMLElement;
    statusRow.dispatchEvent(
      dropEvent("application/x-unifi-drive-overview-entity", "usage_percent"),
    );
    await editor.updateComplete;

    const config = (listener.mock.calls.at(-1)?.[0] as CustomEvent).detail.config;
    expect(config.overview_entities).toEqual([
      "used_storage",
      "usage_percent",
      "overall_status",
    ]);
  });

  it("edits service actions with target and data through GUI controls", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);
    document.body.append(editor);
    await editor.updateComplete;

    const tapSelect = editor.shadowRoot?.querySelector(
      'select[data-action-key="tap_action"]',
    ) as HTMLSelectElement;
    tapSelect.value = "call-service";
    tapSelect.dispatchEvent(new Event("change"));
    await editor.updateComplete;

    const serviceInput = editor.shadowRoot?.querySelector(
      'input[data-action-key="tap_action"][data-action-property="service"]',
    ) as HTMLInputElement;
    serviceInput.value = "script.unifi_drive_backup";
    serviceInput.dispatchEvent(new Event("input"));
    await editor.updateComplete;

    const targetPicker = editor.shadowRoot?.querySelector(
      'ha-entity-picker[data-action-key="tap_action"][data-action-property="target_entity"]',
    ) as HTMLElement;
    targetPicker.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: "button.backup_now" },
      }),
    );
    await editor.updateComplete;

    const areaInput = editor.shadowRoot?.querySelector(
      'input[data-action-key="tap_action"][data-action-property="target_area_id"]',
    ) as HTMLInputElement;
    areaInput.value = "rack, storage";
    areaInput.dispatchEvent(new Event("input"));
    await editor.updateComplete;

    const dataInput = editor.shadowRoot?.querySelector(
      'textarea[data-action-key="tap_action"][data-action-property="data"]',
    ) as HTMLTextAreaElement;
    dataInput.value = '{"force":true}';
    dataInput.dispatchEvent(new Event("input"));
    await editor.updateComplete;

    const config = (listener.mock.calls.at(-1)?.[0] as CustomEvent).detail.config;
    expect(config.tap_action).toEqual({
      action: "perform-action",
      perform_action: "script.unifi_drive_backup",
      target: {
        entity_id: "button.backup_now",
        area_id: ["rack", "storage"],
      },
      data: { force: true },
    });
  });

  it("does not overwrite service actions when data JSON is invalid", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);
    editor.setConfig({
      tap_action: {
        action: "perform-action",
        perform_action: "script.unifi_drive_backup",
        data: { force: true },
      },
    });
    document.body.append(editor);
    await editor.updateComplete;

    const dataInput = editor.shadowRoot?.querySelector(
      'textarea[data-action-key="tap_action"][data-action-property="data"]',
    ) as HTMLTextAreaElement;
    dataInput.value = "{";
    dataInput.dispatchEvent(new Event("input"));
    await editor.updateComplete;

    expect(dataInput.classList.contains("invalid")).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it("allows clearing a configured service action", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);
    editor.setConfig({
      tap_action: {
        action: "perform-action",
        perform_action: "script.unifi_drive_backup",
        target: { entity_id: "button.backup_now" },
      },
    });
    document.body.append(editor);
    await editor.updateComplete;

    const serviceInput = editor.shadowRoot?.querySelector(
      'input[data-action-key="tap_action"][data-action-property="service"]',
    ) as HTMLInputElement;
    serviceInput.value = "";
    serviceInput.dispatchEvent(new Event("input"));
    await editor.updateComplete;

    const config = (listener.mock.calls.at(-1)?.[0] as CustomEvent).detail.config;
    expect(config.tap_action).toEqual({
      action: "perform-action",
      target: { entity_id: "button.backup_now" },
    });
  });
});

function dropEvent(type: string, value: string): DragEvent {
  const event = new Event("drop", {
    bubbles: true,
    cancelable: true,
    composed: true,
  }) as DragEvent;
  Object.defineProperty(event, "dataTransfer", {
    value: {
      dropEffect: "move",
      effectAllowed: "move",
      getData: (requestedType: string) => (requestedType === type ? value : ""),
    },
  });
  return event;
}
