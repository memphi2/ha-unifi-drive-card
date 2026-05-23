import { html } from "lit";
import { localize } from "./i18n";
import { editorFoldout, formRow, switchFormField } from "./editor-form";
import { checkedFromEvent, textInputValue } from "./editor-shared";
import {
  INTEGRATION_DOMAIN,
  type HomeAssistant,
  type NormalizedUnifiDriveCardConfig,
} from "./types";

export type BasicNumberConfigKey = "overview_columns";
export type BasicBooleanConfigKey =
  | "compact"
  | "show_diagnostics"
  | "show_icon_animations"
  | "show_display_buttons"
  | "show_dangerous_actions"
  | "show_unavailable"
  | "show_optional";

interface NumberField {
  key: BasicNumberConfigKey;
  labelKey: string;
  max?: string;
  min: string;
  step: string;
}

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
  numberChanged: (key: BasicNumberConfigKey, event: Event) => void;
  checkboxChanged: (key: BasicBooleanConfigKey, checked: boolean) => void;
}

const DRIVE_DEVICE_SELECTOR = {
  device: {
    filter: [{ integration: INTEGRATION_DOMAIN }],
    entity: [{ domain: "sensor" }],
  },
};

const NUMBER_FIELDS: NumberField[] = [
  { key: "overview_columns", labelKey: "editor.overview_columns", min: "1", max: "6", step: "1" },
];

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
        ${formRow(
          context.hass,
          "editor.name",
          "editor.name_help",
          html`
            <ha-textfield
              .value=${textInputValue(context.config.name)}
              aria-label=${localize(context.hass, "editor.name")}
              .helper=${localize(context.hass, "editor.name_help")}
              helperPersistent
              @input=${context.nameChanged}
            ></ha-textfield>
          `,
        )}
      </div>

      <div class="numeric-grid">
        ${NUMBER_FIELDS.map((field) => numberField(context, field))}
      </div>
      ${editorFoldout(context.hass, {
        className: "advanced-editor",
        titleKey: "editor.advanced_options",
        helpKey: "editor.advanced_options_help",
        content: html`
          <div class="advanced-group checks">
            ${BOOLEAN_FIELDS.map((field) => checkbox(context, field))}
          </div>
        `,
      })}
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

function numberField(context: EditorBasicContext, field: NumberField) {
  return formRow(
    context.hass,
    field.labelKey,
    `${field.labelKey}_help`,
    html`
      <ha-textfield
        type="number"
        inputmode="numeric"
        min=${field.min}
        max=${field.max ?? ""}
        step=${field.step}
        .value=${String(context.config[field.key])}
        aria-label=${localize(context.hass, field.labelKey)}
        .helper=${localize(context.hass, `${field.labelKey}_help`)}
        helperPersistent
        @input=${(event: Event) => context.numberChanged(field.key, event)}
      ></ha-textfield>
    `,
  );
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
