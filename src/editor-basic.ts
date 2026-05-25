import { html } from "lit";
import { localize } from "./i18n";
import { editorFoldout, switchFormField } from "./editor-form";
import { checkedFromEvent, textInputValue } from "./editor-shared";
import {
  INTEGRATION_DOMAIN,
  type HomeAssistant,
  type NormalizedUnifiDriveCardConfig,
} from "./types";

export type BasicBooleanConfigKey =
  | "compact"
  | "show_diagnostics"
  | "show_icon_animations"
  | "show_display_buttons"
  | "show_dangerous_actions"
  | "show_unavailable"
  | "show_optional";

interface BooleanField {
  key: BasicBooleanConfigKey;
  labelKey: string;
}

interface EditorBasicContext {
  hass?: HomeAssistant;
  config: NormalizedUnifiDriveCardConfig;
  devicePreviewLabel?: string;
  devicePreviewReady?: boolean;
  deviceChanged: (event: Event) => void;
  nameChanged: (event: Event) => void;
  checkboxChanged: (key: BasicBooleanConfigKey, checked: boolean) => void;
}

const DRIVE_DEVICE_SELECTOR = {
  device: {
    filter: [{ integration: INTEGRATION_DOMAIN }],
    entity: [{ domain: "sensor" }],
  },
};
const NAME_SELECTOR = {
  text: {},
};

const BOOLEAN_FIELDS: BooleanField[] = [
  { key: "compact", labelKey: "editor.compact" },
  { key: "show_diagnostics", labelKey: "editor.diagnostics" },
  { key: "show_icon_animations", labelKey: "editor.icon_animations" },
  { key: "show_display_buttons", labelKey: "editor.display_buttons" },
  { key: "show_dangerous_actions", labelKey: "editor.dangerous_actions" },
  { key: "show_unavailable", labelKey: "editor.unavailable" },
  { key: "show_optional", labelKey: "editor.optional_missing" },
];

export function renderBasicEditor(context: EditorBasicContext) {
  return html`
    <section class="editor-section basic-editor">
      <h3>${localize(context.hass, "editor.basic_settings")}</h3>
      <div class="ha-form-list">
        <ha-selector
          class="ha-picker-control"
          .hass=${context.hass}
          .label=${localize(context.hass, "editor.device")}
          .helper=${localize(context.hass, "editor.device_help")}
          .selector=${DRIVE_DEVICE_SELECTOR}
          .value=${context.config.device_id ?? ""}
          .required=${true}
          @value-changed=${context.deviceChanged}
        ></ha-selector>
        ${devicePreview(context)}
        <ha-selector
          class="ha-picker-control"
          data-editor-field="name"
          .hass=${context.hass}
          .label=${localize(context.hass, "editor.name")}
          .helper=${localize(context.hass, "editor.name_help")}
          .selector=${NAME_SELECTOR}
          .value=${textInputValue(context.config.name)}
          @value-changed=${context.nameChanged}
          @change=${context.nameChanged}
        ></ha-selector>
      </div>
      <div class="advanced-options-block">${advancedOptionsFoldout(context)}</div>
    </section>
  `;
}

function devicePreview(context: EditorBasicContext) {
  const hasDevice = Boolean(context.config.device_id);
  const statusKey = hasDevice
    ? context.devicePreviewReady
      ? "editor.device_preview_ready"
      : "editor.device_preview_loading"
    : "editor.device_preview_empty";
  const label =
    context.devicePreviewLabel ||
    localize(
      context.hass,
      hasDevice ? "editor.device_preview_selected" : "status.select_device",
    );
  return editorFoldout(context.hass, {
    className: "device-preview-foldout",
    titleKey: "editor.device_preview",
    helpKey: "editor.device_preview_help",
    count: localize(context.hass, statusKey),
    content: html`
      <div class="device-preview">
        <ha-icon icon=${hasDevice ? "mdi:check-circle-outline" : "mdi:devices-off"}></ha-icon>
        <div>
          <strong>${label}</strong>
          <span>${localize(context.hass, statusKey)}</span>
        </div>
      </div>
    `,
  });
}

function advancedOptionsFoldout(context: EditorBasicContext) {
  return editorFoldout(context.hass, {
    className: "advanced-editor",
    titleKey: "editor.advanced_options",
    helpKey: "editor.advanced_options_help",
    content: html`
      <div class="advanced-group checks">
        ${BOOLEAN_FIELDS.map((field) => checkbox(context, field))}
      </div>
    `,
  });
}

function checkbox(context: EditorBasicContext, field: BooleanField) {
  const checked = Boolean(context.config[field.key]);
  return html`
    <div class="check switch-row">
      ${switchFormField(context.hass, field.labelKey, checked, (event: Event) =>
        context.checkboxChanged(field.key, checkedFromEvent(event)),
      { helpKey: `${field.labelKey}_help` },
      )}
    </div>
  `;
}
