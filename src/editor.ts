import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_SECTIONS, ENTITY_DEFINITIONS } from "./catalog";
import { normalizeConfig } from "./config";
import { entityLabel, localize, sectionLabel } from "./i18n";
import type {
  ActionConfig,
  EntityDefinition,
  EntityKey,
  HomeAssistant,
  SectionId,
  UnifiDriveCardConfig,
} from "./types";

type TextConfigKey = "name" | "device_id";
type ActionConfigKey = "tap_action" | "hold_action" | "double_tap_action";
type BooleanConfigKey =
  | "compact"
  | "show_diagnostics"
  | "show_icon_animations"
  | "show_dangerous_actions"
  | "show_unavailable"
  | "show_optional";
type EditorActionName =
  | "none"
  | "more-info"
  | "toggle"
  | "navigate"
  | "url"
  | "call-service";

const TEXT_FIELDS: Array<{ key: TextConfigKey; labelKey: string }> = [
  { key: "name", labelKey: "editor.name" },
  { key: "device_id", labelKey: "editor.device_id" },
];

const BOOLEAN_FIELDS: Array<{ key: BooleanConfigKey; labelKey: string }> = [
  { key: "compact", labelKey: "editor.compact" },
  { key: "show_diagnostics", labelKey: "editor.diagnostics" },
  { key: "show_icon_animations", labelKey: "editor.icon_animations" },
  { key: "show_dangerous_actions", labelKey: "editor.dangerous_actions" },
  { key: "show_unavailable", labelKey: "editor.unavailable" },
  { key: "show_optional", labelKey: "editor.optional_missing" },
];

const ACTION_FIELDS: Array<{ key: ActionConfigKey; labelKey: string }> = [
  { key: "tap_action", labelKey: "editor.tap_action" },
  { key: "hold_action", labelKey: "editor.hold_action" },
  { key: "double_tap_action", labelKey: "editor.double_tap_action" },
];

const ACTION_OPTIONS: EditorActionName[] = [
  "more-info",
  "toggle",
  "navigate",
  "url",
  "call-service",
  "none",
];

@customElement("unifi-drive-card-editor")
export class UnifiDriveCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config = normalizeConfig({});

  public setConfig(config: UnifiDriveCardConfig): void {
    this._config = normalizeConfig(config);
  }

  protected override render() {
    return html`
      <div class="editor">
        <label>
          <span>${localize(this.hass, "editor.anchor_entity")}</span>
          <ha-entity-picker
            .hass=${this.hass}
            .value=${this._config.entity ?? ""}
            .includeDomains=${[
              "binary_sensor",
              "button",
              "number",
              "select",
              "sensor",
              "switch",
              "time",
              "update",
            ]}
            @value-changed=${this._entityChanged}
          ></ha-entity-picker>
        </label>
        ${TEXT_FIELDS.map((field) => this._textField(field))}
        <label>
          <span>${localize(this.hass, "editor.max_sensor_rows")}</span>
          <input
            type="number"
            min="1"
            step="1"
            .value=${String(this._config.max_sensor_rows)}
            @input=${this._numberChanged}
          />
        </label>
        <div class="checks">${BOOLEAN_FIELDS.map((field) => this._checkbox(field))}</div>
        <div class="sections">${DEFAULT_SECTIONS.map((section) => this._sectionToggle(section))}</div>
        <div class="action-grid">${ACTION_FIELDS.map((field) => this._actionField(field))}</div>
        <section class="entity-editor">
          <h3>${localize(this.hass, "editor.entities")}</h3>
          ${DEFAULT_SECTIONS.map((section) => this._entitySection(section))}
        </section>
      </div>
    `;
  }

  private _textField(field: { key: TextConfigKey; labelKey: string }) {
    return html`
      <label>
        <span>${localize(this.hass, field.labelKey)}</span>
        <input
          type="text"
          .value=${typeof this._config[field.key] === "string"
            ? String(this._config[field.key])
            : ""}
          @input=${this._inputChanged(field.key)}
        />
      </label>
    `;
  }

  private _checkbox(field: { key: BooleanConfigKey; labelKey: string }) {
    return html`
      <label class="check">
        <input
          type="checkbox"
          .checked=${Boolean(this._config[field.key])}
          @change=${this._checkboxChanged(field.key)}
        />
        <span>${localize(this.hass, field.labelKey)}</span>
      </label>
    `;
  }

  private _sectionToggle(section: SectionId) {
    return html`
      <label class="check">
        <input
          type="checkbox"
          .checked=${this._config.sections.includes(section)}
          @change=${(event: Event) => this._toggleSection(section, event)}
        />
        <span>${sectionLabel(section, this.hass)}</span>
      </label>
    `;
  }

  private _entitySection(section: SectionId) {
    const definitions = ENTITY_DEFINITIONS.filter(
      (definition) => definition.section === section && !definition.dynamic,
    );
    if (!definitions.length) {
      return "";
    }
    const visibleCount = definitions.filter(
      (definition) => !this._config.hide_entities.includes(definition.key),
    ).length;
    return html`
      <details class="entity-section" ?open=${section === "overview"}>
        <summary>
          <span>${sectionLabel(section, this.hass)}</span>
          <small>${visibleCount}/${definitions.length}</small>
        </summary>
        <div class="entity-mapping-list">
          ${definitions.map((definition) => this._entityMappingRow(definition))}
        </div>
      </details>
    `;
  }

  private _entityMappingRow(definition: EntityDefinition) {
    const hidden = this._config.hide_entities.includes(definition.key);
    const override = entityOverride(this._config.entities, definition);
    return html`
      <div class="entity-mapping-row" data-entity-key=${definition.key}>
        <label class="entity-visible">
          <input
            type="checkbox"
            .checked=${!hidden}
            @change=${(event: Event) => this._entityVisibilityChanged(definition.key, event)}
          />
          <span>${entityLabel(definition, this.hass)}</span>
          <small>${definition.key}</small>
        </label>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${override}
          .includeDomains=${[definition.domain]}
          @value-changed=${(event: CustomEvent<{ value?: string }>) =>
            this._entityOverrideChanged(definition, event)}
        ></ha-entity-picker>
      </div>
    `;
  }

  private _actionField(field: { key: ActionConfigKey; labelKey: string }) {
    const action = this._config[field.key];
    const actionName = actionNameFromConfig(action, field.key);
    return html`
      <div class="action-card">
        <label>
          <span>${localize(this.hass, field.labelKey)}</span>
          <select
            .value=${actionName}
            @change=${(event: Event) => this._actionTypeChanged(field.key, event)}
          >
            ${ACTION_OPTIONS.map(
              (option) =>
                html`<option value=${option} ?selected=${option === actionName}>
                  ${localize(this.hass, `editor.action.${option}`)}
                </option>`,
            )}
          </select>
        </label>
        ${actionName !== "none"
          ? html`
              <label>
                <span>${localize(this.hass, "editor.action_entity")}</span>
                <ha-entity-picker
                  .hass=${this.hass}
                  .value=${typeof action?.entity === "string" ? action.entity : ""}
                  @value-changed=${(event: CustomEvent<{ value?: string }>) =>
                    this._actionEntityChanged(field.key, event)}
                ></ha-entity-picker>
              </label>
            `
          : ""}
        ${actionName === "navigate"
          ? this._actionTextField(field.key, "navigation_path", "editor.navigation_path")
          : ""}
        ${actionName === "url"
          ? this._actionTextField(field.key, "url_path", "editor.url_path")
          : ""}
        ${actionName === "call-service"
          ? this._actionTextField(field.key, "service", "editor.service")
          : ""}
      </div>
    `;
  }

  private _actionTextField(
    key: ActionConfigKey,
    property: "navigation_path" | "url_path" | "service",
    labelKey: string,
  ) {
    const action = this._config[key];
    const value =
      property === "service" ? (action?.service ?? action?.perform_action) : action?.[property];
    return html`
      <label>
        <span>${localize(this.hass, labelKey)}</span>
        <input
          type="text"
          .value=${typeof value === "string" ? value : ""}
          @input=${(event: Event) => this._actionPropertyChanged(key, property, event)}
        />
      </label>
    `;
  }

  private _entityChanged = (event: CustomEvent<{ value?: string }>): void => {
    this._updateConfig({ entity: event.detail.value || undefined });
  };

  private _inputChanged(key: TextConfigKey) {
    return (event: Event): void => {
      this._updateConfig({ [key]: (event.target as HTMLInputElement).value || undefined });
    };
  }

  private _checkboxChanged(key: BooleanConfigKey) {
    return (event: Event): void => {
      this._updateConfig({ [key]: (event.target as HTMLInputElement).checked });
    };
  }

  private _numberChanged = (event: Event): void => {
    this._updateConfig({
      max_sensor_rows: Number.parseInt((event.target as HTMLInputElement).value, 10),
    });
  };

  private _entityVisibilityChanged(key: EntityKey, event: Event): void {
    const hidden = new Set(this._config.hide_entities);
    if ((event.target as HTMLInputElement).checked) {
      hidden.delete(key);
    } else {
      hidden.add(key);
    }
    this._updateConfig({ hide_entities: [...hidden] });
  }

  private _entityOverrideChanged(
    definition: EntityDefinition,
    event: CustomEvent<{ value?: string }>,
  ): void {
    this._updateConfig({
      entities: updateEntityOverride(
        this._config.entities,
        definition,
        event.detail.value || undefined,
      ),
    });
  }

  private _actionTypeChanged(key: ActionConfigKey, event: Event): void {
    this._updateActionConfig(key, { action: (event.target as HTMLSelectElement).value });
  }

  private _actionEntityChanged(
    key: ActionConfigKey,
    event: CustomEvent<{ value?: string }>,
  ): void {
    this._updateActionConfig(key, { entity: event.detail.value || undefined });
  }

  private _actionPropertyChanged(
    key: ActionConfigKey,
    property: "navigation_path" | "url_path" | "service",
    event: Event,
  ): void {
    this._updateActionConfig(key, {
      [property]: (event.target as HTMLInputElement).value || undefined,
    });
  }

  private _updateActionConfig(key: ActionConfigKey, patch: Record<string, unknown>): void {
    const current = this._config[key];
    this._updateConfig({ [key]: actionConfigFromEditor(key, { ...current, ...patch }) });
  }

  private _toggleSection(section: SectionId, event: Event): void {
    const sections = new Set(this._config.sections);
    if ((event.target as HTMLInputElement).checked) {
      sections.add(section);
    } else {
      sections.delete(section);
    }
    this._updateConfig({ sections: [...sections] });
  }

  private _updateConfig(patch: Partial<UnifiDriveCardConfig>): void {
    const next = normalizeConfig({ ...this._config, ...patch });
    this._config = next;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static override styles = css`
    .editor {
      display: grid;
      gap: 16px;
    }

    label {
      display: grid;
      gap: 6px;
    }

    input[type="text"],
    input[type="number"],
    select {
      box-sizing: border-box;
      width: 100%;
      min-height: 40px;
      padding: 8px 10px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }

    input:focus-visible,
    select:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .action-grid,
    .checks,
    .sections {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 8px;
    }

    .action-grid {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .action-card,
    .entity-section {
      display: grid;
      gap: 10px;
      padding: 10px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: color-mix(
        in srgb,
        var(--card-background-color) 88%,
        var(--secondary-background-color)
      );
    }

    .check {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .entity-editor {
      display: grid;
      gap: 8px;
    }

    .entity-editor h3 {
      margin: 0;
      color: var(--secondary-text-color);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .entity-section summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 36px;
      cursor: pointer;
      list-style: none;
    }

    .entity-section summary::-webkit-details-marker {
      display: none;
    }

    .entity-section small {
      color: var(--secondary-text-color);
    }

    .entity-mapping-list {
      display: grid;
      gap: 10px;
    }

    .entity-mapping-row {
      display: grid;
      grid-template-columns: minmax(160px, 1fr) minmax(220px, 1.2fr);
      gap: 10px;
      align-items: center;
    }

    .entity-visible {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 2px 8px;
      align-items: center;
    }

    .entity-visible small {
      grid-column: 2;
    }

    @media (max-width: 640px) {
      .entity-mapping-row {
        grid-template-columns: 1fr;
      }
    }
  `;
}

function entityOverride(
  entities: Record<string, string | Record<string, string> | undefined>,
  definition: EntityDefinition,
): string {
  const direct = entities[definition.key];
  if (typeof direct === "string") {
    return direct;
  }
  const domain = entities[definition.domain];
  if (domain && typeof domain === "object") {
    return domain[definition.key] ?? "";
  }
  return "";
}

function updateEntityOverride(
  entities: Record<string, string | Record<string, string> | undefined>,
  definition: EntityDefinition,
  entityId: string | undefined,
): Record<string, string | Record<string, string> | undefined> {
  const next = { ...entities };
  if (entityId) {
    next[definition.key] = entityId;
  } else {
    delete next[definition.key];
  }
  return next;
}

function actionNameFromConfig(
  action: ActionConfig | undefined,
  key: ActionConfigKey,
): EditorActionName {
  if (!action) {
    return key === "tap_action" ? "more-info" : "none";
  }
  const name = action.action;
  return isActionName(name) ? name : "none";
}

function actionConfigFromEditor(
  key: ActionConfigKey,
  action: ActionConfig,
): ActionConfig | undefined {
  if (action.action === "none") {
    return key === "tap_action" ? { action: "none" } : undefined;
  }
  return action;
}

function isActionName(value: unknown): value is EditorActionName {
  return typeof value === "string" && ACTION_OPTIONS.includes(value as EditorActionName);
}
