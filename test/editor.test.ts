import { describe, expect, it, vi } from "vitest";
import "../src/editor";
import type { UnifiDriveCardEditor } from "../src/editor";

describe("UnifiDriveCardEditor", () => {
  it("renders compact defaults and advanced action controls", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    editor.setConfig({ device_id: "device-a", max_sensor_rows: 4 });
    document.body.append(editor);
    await editor.updateComplete;

    const text = editor.shadowRoot?.textContent ?? "";
    const compact = [...(editor.shadowRoot?.querySelectorAll("label.check") ?? [])].find((item) =>
      item.textContent?.includes("Compact"),
    );

    expect(text).toContain("Anchor entity");
    expect(text).toContain("Max sensor rows");
    expect(text).toContain("Icon animations");
    expect(text).toContain("Tap action");
    expect(text).toContain("Hold action");
    expect(text).toContain("Entities");
    expect(compact?.querySelector("input")?.checked).toBe(true);
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
});
