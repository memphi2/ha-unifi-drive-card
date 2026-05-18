import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_SECTIONS, ENTITY_DEFINITIONS } from "./catalog";
import { normalizeConfig } from "./config";
import {
  ACTION_OPTIONS,
  actionConfigFromEditor,
  actionNameFromConfig,
  formatActionData,
  parseActionData,
  targetFieldToString,
  updateActionTargetField,
  type ActionConfigKey,
  type ActionTargetField,
} from "./editor-actions";
import { editorStyles } from "./editor-styles";
import { entityLabel, localize, sectionLabel } from "./i18n";
import type {
  EntityDefinition,
  EntityKey,
  HomeAssistant,
  SectionId,
  UnifiDriveCardConfig,
} from "./types";

type TextConfigKey = "name" | "device_id";
type NumberConfigKey = "max_sensor_rows";
type ActionTextProperty = "navigation_path" | "url_path" | "service";
type BooleanConfigKey =
  | "compact"
  | "show_diagnostics"
  | "show_icon_animations"
  | "show_display_buttons"
  | "show_dangerous_actions"
  | "show_unavailable"
  | "show_optional";

interface TextField {
  key: TextConfigKey;
  labelKey: string;
}

interface NumberField {
  key: NumberConfigKey;
  labelKey: string;
  min: string;
  step: string;
}

interface BooleanField {
  key: BooleanConfigKey;
  labelKey: string;
}

interface ActionField {
  key: ActionConfigKey;
  labelKey: string;
}

const TEXT_FIELDS: TextField[] = [
  { key: "name", labelKey: "editor.name" },
  { key: "device_id", labelKey: "editor.device_id" },
];

const NUMBER_FIELDS: NumberField[] = [
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

const ACTION_FIELDS: ActionField[] = [
  { key: "tap_action", labelKey: "editor.tap_action" },
  { key: "hold_action", labelKey: "editor.hold_action" },
  { key: "double_tap_action", labelKey: "editor.double_tap_action" },
];

const EDITOR_ENTITY_DEFINITIONS = ENTITY_DEFINITIONS.filter(
  (definition) => !definition.dynamic,
);
const EDITOR_ENTITY_DEFINITION_BY_KEY = new Map(
  EDITOR_ENTITY_DEFINITIONS.map((definition) => [definition.key, definition]),
);

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
        <div class="numeric-grid">${NUMBER_FIELDS.map((field) => this._numberField(field))}</div>
        <div class="checks">${BOOLEAN_FIELDS.map((field) => this._checkbox(field))}</div>
        ${this._sectionOrderEditor()}
        ${this._overviewEntityEditor()}
        <div class="action-grid">${ACTION_FIELDS.map((field) => this._actionField(field))}</div>
        <section class="entity-editor">
          <h3>${localize(this.hass, "editor.entities")}</h3>
          ${DEFAULT_SECTIONS.map((section) => this._entitySection(section))}
        </section>
      </div>
    `;
  }

  private _textField(field: TextField) {
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

  private _numberField(field: NumberField) {
    return html`
      <label>
        <span>${localize(this.hass, field.labelKey)}</span>
        <input
          type="number"
          min=${field.min}
          step=${field.step}
          .value=${String(this._config[field.key])}
          @input=${this._numberChanged(field.key)}
        />
      </label>
    `;
  }

  private _sectionOrderEditor() {
    const sections = orderedSectionsForEditor(this._config.sections);
    return html`
      <section class="sections-editor">
        <h3>${localize(this.hass, "editor.sections")}</h3>
        <p>${localize(this.hass, "editor.sections_help")}</p>
        <div class="order-list section-order-list">
          ${sections.map((section) => this._sectionToggle(section))}
        </div>
      </section>
    `;
  }

  private _sectionToggle(section: SectionId) {
    const checked = this._config.sections.includes(section);
    const selectedIndex = this._config.sections.indexOf(section);
    return html`
      <div class="order-row section-order-row" data-section-key=${section}>
        <label class="check">
          <input
            type="checkbox"
            .checked=${checked}
            @change=${(event: Event) => this._toggleSection(section, event)}
          />
          <span>${sectionLabel(section, this.hass)}</span>
        </label>
        <div class="order-actions">
          <button
            class="icon-button"
            type="button"
            title=${localize(this.hass, "editor.move_up")}
            aria-label=${localize(this.hass, "editor.move_up")}
            ?disabled=${!checked || selectedIndex <= 0}
            @click=${() => this._moveSection(section, -1)}
          >
            <ha-icon icon="mdi:chevron-up"></ha-icon>
          </button>
          <button
            class="icon-button"
            type="button"
            title=${localize(this.hass, "editor.move_down")}
            aria-label=${localize(this.hass, "editor.move_down")}
            ?disabled=${!checked || selectedIndex < 0 || selectedIndex >= this._config.sections.length - 1}
            @click=${() => this._moveSection(section, 1)}
          >
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  private _overviewEntityEditor() {
    const selected = new Set(this._config.overview_entities);
    const selectedDefinitions = this._config.overview_entities
      .map((key) => EDITOR_ENTITY_DEFINITION_BY_KEY.get(key))
      .filter((definition): definition is EntityDefinition => Boolean(definition));
    const availableDefinitions = EDITOR_ENTITY_DEFINITIONS.filter(
      (definition) => !selected.has(definition.key),
    );
    return html`
      <section class="overview-editor">
        <h3>${localize(this.hass, "editor.overview_entities")}</h3>
        <p>${localize(this.hass, "editor.overview_entities_help")}</p>
        <div class="overview-entity-groups">
          <div class="overview-entity-group">
            <h4>${localize(this.hass, "editor.selected_overview_entities")}</h4>
            <div class="order-list overview-order-list">
              ${selectedDefinitions.map((definition) =>
                this._overviewEntityToggle(definition, selected),
              )}
            </div>
          </div>
          <div class="overview-entity-group">
            <h4>${localize(this.hass, "editor.available_overview_entities")}</h4>
            <div class="overview-entity-grid">
              ${availableDefinitions.map((definition) =>
                this._overviewEntityToggle(definition, selected),
              )}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  private _overviewEntityToggle(definition: EntityDefinition, selected: Set<EntityKey>) {
    const checked = selected.has(definition.key);
    const selectedIndex = this._config.overview_entities.indexOf(definition.key);
    return html`
      <div class="overview-entity-toggle" data-overview-key=${definition.key}>
        <label class="check">
          <input
            type="checkbox"
            .checked=${checked}
            @change=${(event: Event) => this._overviewEntityChanged(definition.key, event)}
          />
          <span>${entityLabel(definition, this.hass)}</span>
        </label>
        ${checked
          ? html`
              <div class="order-actions">
                <button
                  class="icon-button"
                  type="button"
                  title=${localize(this.hass, "editor.move_up")}
                  aria-label=${localize(this.hass, "editor.move_up")}
                  ?disabled=${selectedIndex <= 0}
                  @click=${() => this._moveOverviewEntity(definition.key, -1)}
                >
                  <ha-icon icon="mdi:chevron-up"></ha-icon>
                </button>
                <button
                  class="icon-button"
                  type="button"
                  title=${localize(this.hass, "editor.move_down")}
                  aria-label=${localize(this.hass, "editor.move_down")}
                  ?disabled=${selectedIndex >= this._config.overview_entities.length - 1}
                  @click=${() => this._moveOverviewEntity(definition.key, 1)}
                >
                  <ha-icon icon="mdi:chevron-down"></ha-icon>
                </button>
              </div>
            `
          : ""}
      </div>
    `;
  }

  private _checkbox(field: BooleanField) {
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

  private _entitySection(section: SectionId) {
    const definitions = definitionsForSection(section);
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

  private _actionField(field: ActionField) {
    const action = this._config[field.key];
    const actionName = actionNameFromConfig(action, field.key);
    return html`
      <div class="action-card">
        <label>
          <span>${localize(this.hass, field.labelKey)}</span>
          <select
            data-action-key=${field.key}
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
                  data-action-key=${field.key}
                  data-action-property="entity"
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
          ? html`
              ${this._actionTextField(field.key, "service", "editor.service")}
              ${this._actionTargetEntityField(field.key)}
              ${this._actionTargetTextField(
                field.key,
                "area_id",
                "editor.service_target_area",
              )}
              ${this._actionTargetTextField(
                field.key,
                "device_id",
                "editor.service_target_device",
              )}
              ${this._actionDataField(field.key)}
            `
          : ""}
      </div>
    `;
  }

  private _actionTextField(
    key: ActionConfigKey,
    property: ActionTextProperty,
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
          data-action-key=${key}
          data-action-property=${property}
          .value=${typeof value === "string" ? value : ""}
          @input=${(event: Event) => this._actionPropertyChanged(key, property, event)}
        />
      </label>
    `;
  }

  private _actionTargetEntityField(key: ActionConfigKey) {
    const action = this._config[key];
    return html`
      <label>
        <span>${localize(this.hass, "editor.service_target_entity")}</span>
        <ha-entity-picker
          data-action-key=${key}
          data-action-property="target_entity"
          .hass=${this.hass}
          .value=${targetFieldToString(action?.target, "entity_id")}
          @value-changed=${(event: CustomEvent<{ value?: string }>) =>
            this._actionTargetEntityChanged(key, event)}
        ></ha-entity-picker>
      </label>
    `;
  }

  private _actionTargetTextField(
    key: ActionConfigKey,
    field: Exclude<ActionTargetField, "entity_id">,
    labelKey: string,
  ) {
    const action = this._config[key];
    return html`
      <label>
        <span>${localize(this.hass, labelKey)}</span>
        <input
          type="text"
          data-action-key=${key}
          data-action-property=${`target_${field}`}
          .value=${targetFieldToString(action?.target, field)}
          @input=${(event: Event) => this._actionTargetTextChanged(key, field, event)}
        />
      </label>
    `;
  }

  private _actionDataField(key: ActionConfigKey) {
    const action = this._config[key];
    return html`
      <label>
        <span>${localize(this.hass, "editor.service_data")}</span>
        <textarea
          data-action-key=${key}
          data-action-property="data"
          .value=${formatActionData(action?.data)}
          @input=${(event: Event) => this._actionDataChanged(key, event)}
        ></textarea>
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

  private _numberChanged(key: NumberConfigKey) {
    return (event: Event): void => {
      this._updateConfig({
        [key]: Number.parseInt((event.target as HTMLInputElement).value, 10),
      });
    };
  }

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
    property: ActionTextProperty,
    event: Event,
  ): void {
    this._updateActionConfig(key, {
      [property]: (event.target as HTMLInputElement).value || undefined,
    });
  }

  private _actionTargetEntityChanged(
    key: ActionConfigKey,
    event: CustomEvent<{ value?: string }>,
  ): void {
    this._updateActionTarget(key, "entity_id", event.detail.value);
  }

  private _actionTargetTextChanged(
    key: ActionConfigKey,
    field: Exclude<ActionTargetField, "entity_id">,
    event: Event,
  ): void {
    this._updateActionTarget(key, field, (event.target as HTMLInputElement).value);
  }

  private _updateActionTarget(
    key: ActionConfigKey,
    field: ActionTargetField,
    value: string | undefined,
  ): void {
    this._updateActionConfig(key, {
      target: updateActionTargetField(this._config[key]?.target, field, value),
    });
  }

  private _actionDataChanged(key: ActionConfigKey, event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    const parsed = parseActionData(target.value);
    target.classList.toggle("invalid", !parsed.valid);
    target.toggleAttribute("aria-invalid", !parsed.valid);
    if (!parsed.valid) {
      return;
    }
    this._updateActionConfig(key, { data: parsed.value });
  }

  private _updateActionConfig(key: ActionConfigKey, patch: Record<string, unknown>): void {
    const current = this._config[key];
    this._updateConfig({ [key]: actionConfigFromEditor(key, { ...current, ...patch }) });
  }

  private _toggleSection(section: SectionId, event: Event): void {
    const sections = [...this._config.sections];
    if ((event.target as HTMLInputElement).checked) {
      if (!sections.includes(section)) {
        sections.push(section);
      }
    } else {
      const index = sections.indexOf(section);
      if (index >= 0) {
        sections.splice(index, 1);
      }
    }
    this._updateConfig({ sections });
  }

  private _moveSection(section: SectionId, direction: -1 | 1): void {
    this._updateConfig({ sections: moveItem(this._config.sections, section, direction) });
  }

  private _overviewEntityChanged(key: EntityKey, event: Event): void {
    const overview_entities = [...this._config.overview_entities];
    if ((event.target as HTMLInputElement).checked) {
      if (!overview_entities.includes(key)) {
        overview_entities.push(key);
      }
    } else {
      const index = overview_entities.indexOf(key);
      if (index >= 0) {
        overview_entities.splice(index, 1);
      }
    }
    this._updateConfig({ overview_entities });
  }

  private _moveOverviewEntity(key: EntityKey, direction: -1 | 1): void {
    this._updateConfig({
      overview_entities: moveItem(this._config.overview_entities, key, direction),
    });
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

  static override styles = editorStyles;
}

function orderedSectionsForEditor(selectedSections: SectionId[]): SectionId[] {
  const selected = new Set(selectedSections);
  return [
    ...selectedSections,
    ...DEFAULT_SECTIONS.filter((section) => !selected.has(section)),
  ];
}

function definitionsForSection(section: SectionId): EntityDefinition[] {
  return EDITOR_ENTITY_DEFINITIONS.filter((definition) => definition.section === section);
}

function moveItem<T>(items: T[], item: T, direction: -1 | 1): T[] {
  const next = [...items];
  const index = next.indexOf(item);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= next.length) {
    return next;
  }
  const current = next[index] as T;
  next[index] = next[target] as T;
  next[target] = current;
  return next;
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
  const domain = next[definition.domain];
  if (domain && typeof domain === "object" && !Array.isArray(domain)) {
    const nested = { ...domain };
    delete nested[definition.key];
    if (Object.keys(nested).length) {
      next[definition.domain] = nested;
    } else {
      delete next[definition.domain];
    }
  }
  if (entityId) {
    next[definition.key] = entityId;
  } else {
    delete next[definition.key];
  }
  return next;
}
