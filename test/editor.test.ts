import { describe, expect, it, vi } from "vitest";
import "../src/editor";
import type { UnifiDriveCardEditor } from "../src/editor";
import type { HomeAssistant, UnifiDriveCardConfig } from "../src/types";

describe("UnifiDriveCardEditor", () => {
  it("renders compact defaults and advanced action controls", async () => {
    const editor = await createEditor({
      config: { device_id: "device-a" },
    });

    const text = editor.shadowRoot?.textContent ?? "";
    const compact = [...(editor.shadowRoot?.querySelectorAll(".check") ?? [])].find((item) =>
      item.textContent?.includes("Compact"),
    );

    expect(text).toContain("Device and layout");
    expect(text).toContain("Advanced options");
    expect(text).toContain("Device");
    expect(text).toContain("Icon animations");
    expect(text).toContain("Display tiles");
    expect(text).toContain("Sections");
    expect(text).toContain("Overview tiles");
    expect(text).toContain("Tap action");
    expect(text).toContain("Hold action");
    expect(text).toContain("Selected entities");
    expect(text).not.toContain("Overview columns");
    const compactSwitch = compact?.querySelector("ha-switch") as
      | (HTMLElement & { checked?: boolean })
      | null;
    expect(compactSwitch?.checked).toBe(true);
    expect(text).not.toContain("storage_problem");
  });

  it("uses the Home Assistant device selector for selection", async () => {
    const listener = vi.fn();
    const editor = await createEditor({
      config: { device_id: "device-a" },
      listener,
    });

    const devicePicker = editor.shadowRoot?.querySelector(
      ".basic-editor ha-selector",
    ) as HTMLElement & {
      helper?: string;
      selector?: {
        device?: {
          filter?: { integration?: string }[];
          entity?: { domain?: string }[];
        };
      };
      required?: boolean;
      label?: string;
      value?: string;
    };
    expect(devicePicker.value).toBe("device-a");
    expect(devicePicker.label).toBe("Device");
    expect(devicePicker.helper).toContain("Home Assistant device");
    expect(devicePicker.required).toBe(true);
    expect(devicePicker.selector?.device?.filter?.at(0)?.integration).toBe("unifi_unas");
    expect(devicePicker.selector?.device?.entity?.at(0)?.domain).toBe("sensor");
    expect(editor.shadowRoot?.querySelector(".basic-editor ha-entity-picker")).toBeNull();

    devicePicker.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: "device-b" },
      }),
    );
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.device_id).toBe("device-b");
  });

  it("updates name via Home Assistant value-changed events", async () => {
    const listener = vi.fn();
    const editor = await createEditor({
      config: { device_id: "device-a" },
      listener,
    });

    const nameField = editor.shadowRoot?.querySelector(
      'ha-selector[data-editor-field="name"]',
    ) as HTMLElement;
    nameField.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: "UNAS Rack" },
        bubbles: true,
        composed: true,
      }),
    );
    await editor.updateComplete;

    let config = getLatestConfig(listener);
    expect(config.name).toBe("UNAS Rack");

    nameField.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: "" },
        bubbles: true,
        composed: true,
      }),
    );
    await editor.updateComplete;

    config = getLatestConfig(listener);
    expect(config.name).toBeUndefined();
  });

  it("does not render overview columns field in the visual editor", async () => {
    const editor = await createEditor({ config: {} });
    const overviewField = editor.shadowRoot?.querySelector(
      'ha-textfield[data-editor-field="overview_columns"]',
    );
    const advancedFoldout = editor.shadowRoot?.querySelector(
      ".advanced-editor",
    ) as HTMLElement;
    expect(overviewField).toBeNull();
    expect(advancedFoldout).toBeTruthy();
    expect(advancedFoldout.closest(".ha-form-row")).toBeNull();
    expect(advancedFoldout.closest(".advanced-options-block")).toBeTruthy();
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

  it("renders actions first, then section order, then overview, then section entity editors", async () => {
    const editor = await createEditor({ config: {} });
    const topSections = [...(editor.shadowRoot?.querySelectorAll(".editor > section") ?? [])] as HTMLElement[];
    const actionsIndex = topSections.findIndex((section) => section.classList.contains("actions-editor"));
    const sectionsIndex = topSections.findIndex((section) => section.classList.contains("sections-editor"));
    const overviewIndex = topSections.findIndex((section) => section.classList.contains("overview-editor"));
    const entitySectionsIndex = topSections.findIndex((section) =>
      section.classList.contains("section-entities-editor"),
    );
    expect(actionsIndex).toBeGreaterThanOrEqual(0);
    expect(sectionsIndex).toBeGreaterThanOrEqual(0);
    expect(overviewIndex).toBeGreaterThanOrEqual(0);
    expect(entitySectionsIndex).toBeGreaterThanOrEqual(0);
    expect(actionsIndex).toBeLessThan(sectionsIndex);
    expect(sectionsIndex).toBeLessThan(overviewIndex);
    expect(overviewIndex).toBeLessThan(entitySectionsIndex);
  });

  it("reorders sections through drag-handle keyboard arrows", async () => {
    const listener = vi.fn();
    const editor = await createEditor({ config: { sections: ["overview", "storage", "system"] }, listener });

    const overviewRow = editor.shadowRoot?.querySelector(
      '[data-section-key="overview"]',
    ) as HTMLElement;
    overviewRow
      .querySelector(".drag-handle")
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.sections).toEqual(["storage", "overview", "system"]);
  });

  it("drags moved sections to the target row", async () => {
    const listener = vi.fn();
    const editor = await createEditor({ config: { sections: ["overview", "storage", "system"] }, listener });

    const systemRow = editor.shadowRoot?.querySelector(
      '[data-section-key="system"]',
    ) as HTMLElement;
    systemRow.dispatchEvent(
      dropEvent("application/x-unifi-drive-section", "overview"),
    );
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.sections).toEqual(["storage", "system", "overview"]);
  });

  it("keeps adjacent downward section drops moving to the target row", async () => {
    const listener = vi.fn();
    const editor = await createEditor({ config: { sections: ["overview", "storage", "system"] }, listener });

    const systemRow = editor.shadowRoot?.querySelector(
      '[data-section-key="system"]',
    ) as HTMLElement;
    systemRow.dispatchEvent(
      dropEvent("application/x-unifi-drive-section", "storage"),
    );
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.sections).toEqual(["overview", "system", "storage"]);
  });

  it("reorders overview tiles through keyboard arrows", async () => {
    const listener = vi.fn();
    const editor = await createEditor({
      config: { overview_entities: ["usage_percent", "used_storage"] },
      listener,
    });

    const usageRow = editor.shadowRoot?.querySelector(
      '[data-overview-key="usage_percent"]',
    ) as HTMLElement;
    usageRow
      .querySelector(".drag-handle")
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.overview_entities).toEqual(["used_storage", "usage_percent"]);
  });

  it("uses drag handles instead of move buttons for section and overview ordering", async () => {
    const editor = await createEditor({
      config: {
        sections: ["overview", "storage", "system"],
        overview_entities: ["usage_percent", "used_storage"],
      },
    });

    const sectionRow = editor.shadowRoot?.querySelector(
      '[data-section-key="storage"]',
    ) as HTMLElement;
    const overviewRow = editor.shadowRoot?.querySelector(
      '[data-overview-key="usage_percent"]',
    ) as HTMLElement;

    const sectionButtons = [...sectionRow.querySelectorAll(".order-actions button")];
    const overviewButtons = [...overviewRow.querySelectorAll(".order-actions button")];

    expect(sectionButtons).toHaveLength(1);
    expect(sectionButtons[0]?.classList.contains("drag-handle")).toBe(true);
    expect(sectionButtons[0]?.getAttribute("aria-keyshortcuts")).toBe("ArrowUp ArrowDown");
    expect(overviewButtons).toHaveLength(1);
    expect(overviewButtons[0]?.classList.contains("drag-handle")).toBe(true);
    expect(overviewButtons[0]?.getAttribute("aria-keyshortcuts")).toBe("ArrowUp ArrowDown");
  });

  it("drags moved overview tiles to the target row", async () => {
    const listener = vi.fn();
    const editor = await createEditor({
      config: {
      overview_entities: ["usage_percent", "used_storage", "overall_status"],
      },
      listener,
    });

    const usageRow = editor.shadowRoot?.querySelector(
      '[data-overview-key="usage_percent"]',
    ) as HTMLElement;
    usageRow.dispatchEvent(
      dropEvent("application/x-unifi-drive-overview-entity", "overall_status"),
    );
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.overview_entities).toEqual([
      "overall_status",
      "usage_percent",
      "used_storage",
    ]);
  });

  it("keeps adjacent downward overview drops moving to the end", async () => {
    const listener = vi.fn();
    const editor = await createEditor({
      config: {
      overview_entities: ["usage_percent", "used_storage", "overall_status"],
      },
      listener,
    });

    const statusRow = editor.shadowRoot?.querySelector(
      '[data-overview-key="overall_status"]',
    ) as HTMLElement;
    statusRow.dispatchEvent(
      dropEvent("application/x-unifi-drive-overview-entity", "used_storage"),
    );
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.overview_entities).toEqual([
      "usage_percent",
      "overall_status",
      "used_storage",
    ]);
  });

  it("preserves inactive stored overview keys when toggling active tiles", async () => {
    const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);
    editor.hass = {
      states: {
        "sensor.unifi_drive_usage_percent": entityState("42"),
        "sensor.unifi_drive_system_status": entityState("online"),
        "sensor.unifi_drive_used_storage": entityState("420"),
      },
      entities: {
        "sensor.unifi_drive_usage_percent": registryEntity("dev-a", "usage_percent"),
        "sensor.unifi_drive_system_status": registryEntity("dev-a", "system_status"),
        "sensor.unifi_drive_used_storage": {
          ...registryEntity("dev-a", "used_storage"),
          disabled_by: "integration",
        },
      },
      callService: async () => undefined,
    };
    editor.setConfig({ overview_entities: ["used_storage"] });
    document.body.append(editor);
    await editor.updateComplete;

    const usageToggle = editor.shadowRoot?.querySelector(
      '.overview-editor [data-overview-key="usage_percent"] ha-switch',
    ) as HTMLElement & { checked: boolean };
    usageToggle.checked = true;
    usageToggle.dispatchEvent(new Event("change"));
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.overview_entities).toEqual(["used_storage", "usage_percent"]);
  });

  it("renders per-entity override controls in section selectors", async () => {
    const editor = await createEditor({ config: {} });
    const row = editor.shadowRoot?.querySelector(
      '[data-entity-section="storage"][data-entity-key="usage_percent"]',
    ) as HTMLElement;
    expect(row.querySelector("ha-selector, ha-entity-picker")).toBeTruthy();
    expect(row.querySelector("ha-textfield")).toBeTruthy();
  });

  it("updates section entity overrides from selector controls", async () => {
    const listener = vi.fn();
    const editor = await createEditor({ listener });
    const row = editor.shadowRoot?.querySelector(
      '[data-entity-section="storage"][data-entity-key="usage_percent"]',
    ) as HTMLElement;

    const picker = row.querySelector("ha-selector, ha-entity-picker") as HTMLElement;
    picker.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: "sensor.custom_usage_picker" },
        bubbles: true,
        composed: true,
      }),
    );
    await editor.updateComplete;

    let config = getLatestConfig(listener);
    expect(config.entities?.usage_percent).toBe("sensor.custom_usage_picker");

    const textfield = row.querySelector("ha-textfield") as HTMLElement & { value: string };
    textfield.value = "sensor.custom_usage_manual";
    textfield.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await editor.updateComplete;

    config = getLatestConfig(listener);
    expect(config.entities?.usage_percent).toBe("sensor.custom_usage_manual");

    textfield.value = "";
    textfield.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await editor.updateComplete;

    config = getLatestConfig(listener);
    expect(config.entities?.usage_percent).toBeUndefined();
  });

  it("reorders selected section entities via drag and persists section_entity_order", async () => {
    const listener = vi.fn();
    const editor = await createEditor({ listener });

    const usedStorageRow = editor.shadowRoot?.querySelector(
      '[data-entity-section="storage"][data-entity-key="used_storage"]',
    ) as HTMLElement;
    usedStorageRow.dispatchEvent(
      dropEvent("application/x-unifi-drive-section-entity", "usage_percent"),
    );
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    const order = config.section_entity_order?.storage ?? [];
    expect(order.indexOf("usage_percent")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("used_storage")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("used_storage")).toBeLessThan(order.indexOf("usage_percent"));
  });

  it("keeps configured section entities visible when only some section keys are active", async () => {
    const editor = await createEditor({
      hass: {
        states: {
          "sensor.unifi_drive_usage_percent": entityState("42"),
        },
        entities: {
          "sensor.unifi_drive_usage_percent": registryEntity("dev-a", "usage_percent"),
        },
        callService: async () => undefined,
      },
      config: {
        device_id: "dev-a",
        section_entity_order: { storage: ["used_storage", "usage_percent"] },
      },
    });

    const usedStorageRow = editor.shadowRoot?.querySelector(
      '[data-entity-section="storage"][data-entity-key="used_storage"]',
    ) as HTMLElement | null;
    expect(usedStorageRow).toBeTruthy();
  });

  it("does not render section drag handles for unchecked entities", async () => {
    const editor = await createEditor({
      config: {
        hide_entities: ["fan_mode"],
      },
    });

    const row = editor.shadowRoot?.querySelector(
      '[data-entity-section="system"][data-entity-key="fan_mode"]',
    ) as HTMLElement;
    expect(row.querySelector(".drag-handle")).toBeNull();
  });

  it("treats dangerous entities as unchecked when system actions are disabled", async () => {
    const editor = await createEditor({
      config: {
        show_dangerous_actions: false,
      },
    });

    const shutdownSwitch = editor.shadowRoot?.querySelector(
      '[data-entity-section="system"][data-entity-key="shutdown"] ha-switch',
    ) as HTMLElement & { checked: boolean };
    expect(shutdownSwitch.checked).toBe(false);
  });

  it("enabling a dangerous entity also enables system actions", async () => {
    const listener = vi.fn();
    const editor = await createEditor({
      config: {
        show_dangerous_actions: false,
        hide_entities: ["shutdown"],
      },
      listener,
    });

    const shutdownSwitch = editor.shadowRoot?.querySelector(
      '[data-entity-section="system"][data-entity-key="shutdown"] ha-switch',
    ) as HTMLElement & { checked: boolean };
    shutdownSwitch.checked = true;
    shutdownSwitch.dispatchEvent(new Event("change"));
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.show_dangerous_actions).toBe(true);
    expect(config.hide_entities).not.toContain("shutdown");
  });

  it("edits service actions with target and data through GUI controls", async () => {
    const listener = vi.fn();
    const editor = await createEditor({ listener });

    const tapSelect = editor.shadowRoot?.querySelector(
      'select[data-action-key="tap_action"]',
    ) as HTMLSelectElement;
    tapSelect.value = "call-service";
    tapSelect.dispatchEvent(new Event("change"));
    await editor.updateComplete;

    const serviceInput = editor.shadowRoot?.querySelector(
      'ha-textfield[data-action-key="tap_action"][data-action-property="service"]',
    ) as HTMLElement & { value: string };
    serviceInput.value = "script.unifi_unas_backup";
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
      'ha-textfield[data-action-key="tap_action"][data-action-property="target_area_id"]',
    ) as HTMLElement & { value: string };
    areaInput.value = "rack, storage";
    areaInput.dispatchEvent(new Event("input"));
    await editor.updateComplete;

    const dataInput = editor.shadowRoot?.querySelector(
      'ha-textarea[data-action-key="tap_action"][data-action-property="data"]',
    ) as HTMLElement & { value: string };
    dataInput.value = '{"force":true}';
    dataInput.dispatchEvent(new Event("input"));
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.tap_action).toEqual({
      action: "perform-action",
      perform_action: "script.unifi_unas_backup",
      target: {
        entity_id: "button.backup_now",
        area_id: ["rack", "storage"],
      },
      data: { force: true },
    });
  });

  it("does not overwrite service actions when data JSON is invalid", async () => {
    const listener = vi.fn();
    const editor = await createEditor({
      config: {
      tap_action: {
        action: "perform-action",
        perform_action: "script.unifi_unas_backup",
        data: { force: true },
      },
      },
      listener,
    });

    const dataInput = editor.shadowRoot?.querySelector(
      'ha-textarea[data-action-key="tap_action"][data-action-property="data"]',
    ) as HTMLElement & { value: string };
    dataInput.value = "{";
    dataInput.dispatchEvent(new Event("input"));
    await editor.updateComplete;

    expect(dataInput.classList.contains("invalid")).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it("allows clearing a configured service action", async () => {
    const listener = vi.fn();
    const editor = await createEditor({
      config: {
      tap_action: {
        action: "perform-action",
        perform_action: "script.unifi_unas_backup",
        target: { entity_id: "button.backup_now" },
      },
      },
      listener,
    });
    await setTextInput(
      editor,
      'ha-textfield[data-action-key="tap_action"][data-action-property="service"]',
      "",
      "input",
    );
    await editor.updateComplete;

    const config = getLatestConfig(listener);
    expect(config.tap_action).toEqual({
      action: "perform-action",
      target: { entity_id: "button.backup_now" },
    });
  });
});

async function createEditor({
  hass,
  config,
  listener,
}: {
  hass?: HomeAssistant;
  config?: Partial<UnifiDriveCardConfig>;
  listener?: ReturnType<typeof vi.fn>;
} = {}) {
  const editor = document.createElement("unifi-drive-card-editor") as UnifiDriveCardEditor;
  if (listener) {
    editor.addEventListener("config-changed", listener);
  }
  if (hass) {
    editor.hass = hass;
  }
  if (config) {
    editor.setConfig(config);
  }
  document.body.append(editor);
  await editor.updateComplete;
  return editor;
}

function getLatestConfig(listener: ReturnType<typeof vi.fn>): UnifiDriveCardConfig {
  return (
    listener.mock.calls.at(-1)?.[0] as CustomEvent<{ config: UnifiDriveCardConfig }>
  ).detail.config;
}

async function setTextInput(
  editor: UnifiDriveCardEditor,
  selector: string,
  value: string,
  eventType: string,
) {
  const input = editor.shadowRoot?.querySelector(selector) as HTMLElement & { value: string };
  input.value = value;
  input.dispatchEvent(new Event(eventType));
  await editor.updateComplete;
}

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

function entityState(value: string) {
  return { state: value, attributes: {} };
}

function registryEntity(deviceId?: string, translationKey?: string) {
  return {
    config_entry_id: "entry-a",
    device_id: deviceId,
    platform: "unifi_unas",
    translation_key: translationKey,
    unique_id: `unifi_unas_entry_${translationKey}`,
  };
}
