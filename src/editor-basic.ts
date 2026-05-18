import { html } from "lit";
import { localize } from "./i18n";
import type { EntityDomain, HomeAssistant, NormalizedUnifiDriveCardConfig } from "./types";

export type BasicNumberConfigKey = "overview_columns" | "max_sensor_rows";
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

export interface EditorBasicContext {
  hass?: HomeAssistant;
  config: NormalizedUnifiDriveCardConfig;
  includeDomains: EntityDomain[];
  deviceChanged: (event: Event) => void;
  entityChanged: (event: Event) => void;
  nameChanged: (event: Event) => void;
  numberChanged: (key: BasicNumberConfigKey, event: Event) => void;
  checkboxChanged: (key: BasicBooleanConfigKey, checked: boolean) => void;
}

const NUMBER_FIELDS: NumberField[] = [
  { key: "overview_columns", labelKey: "editor.overview_columns", min: "1", max: "6", step: "1" },
  { key: "max_sensor_rows", labelKey: "editor.max_sensor_rows", min: "1", step: "1" },
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
        <ha-device-picker
          class="ha-picker-control"
          .hass=${context.hass}
          .label=${localize(context.hass, "editor.device")}
          .helper=${localize(context.hass, "editor.device_help")}
          .includeDomains=${context.includeDomains}
          .value=${context.config.device_id ?? ""}
          @value-changed=${context.deviceChanged}
          @device-picked=${context.deviceChanged}
        ></ha-device-picker>
        <ha-entity-picker
          class="ha-picker-control"
          .hass=${context.hass}
          .label=${localize(context.hass, "editor.anchor_entity")}
          .value=${context.config.entity ?? ""}
          .includeDomains=${context.includeDomains}
          @value-changed=${context.entityChanged}
        ></ha-entity-picker>
        <label class="ha-form-row">
          <span>${localize(context.hass, "editor.name")}</span>
          <input
            type="text"
            .value=${textInputValue(context.config.name)}
            @input=${context.nameChanged}
          />
        </label>
      </div>

      <div class="numeric-grid">
        ${NUMBER_FIELDS.map((field) => numberField(context, field))}
      </div>
      <div class="checks">
        ${BOOLEAN_FIELDS.map((field) => checkbox(context, field))}
      </div>
    </section>
  `;
}

function numberField(context: EditorBasicContext, field: NumberField) {
  return html`
    <label>
      <span>${localize(context.hass, field.labelKey)}</span>
      <input
        type="number"
        min=${field.min}
        max=${field.max ?? ""}
        step=${field.step}
        .value=${String(context.config[field.key])}
        @input=${(event: Event) => context.numberChanged(field.key, event)}
      />
    </label>
  `;
}

function checkbox(context: EditorBasicContext, field: BooleanField) {
  const checked = Boolean(context.config[field.key]);
  return html`
    <div class="check switch-row">
      <ha-switch
        .checked=${checked}
        @change=${(event: Event) => context.checkboxChanged(field.key, checkedFromEvent(event))}
      ></ha-switch>
      <button
        class="switch-label"
        type="button"
        @click=${() => context.checkboxChanged(field.key, !checked)}
      >
        ${localize(context.hass, field.labelKey)}
      </button>
    </div>
  `;
}

function textInputValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function checkedFromEvent(event: Event): boolean {
  return Boolean((event.target as { checked?: boolean }).checked);
}
