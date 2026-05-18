import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DEFAULT_SECTIONS, ENTITY_DEFINITIONS } from "./catalog";
import { normalizeConfig } from "./config";
import { discoverEntities } from "./discovery";
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
import {
  renderBasicEditor,
  type BasicBooleanConfigKey,
  type BasicNumberConfigKey,
} from "./editor-basic";
import {
  activeOverviewEntities,
  moveItem,
  moveActiveOverviewEntity,
  reorderActiveOverviewEntity,
  reorderItem,
  renderOverviewEntityEditor,
  renderSectionOrderEditor,
  toggleListItem,
  type EditorOrderingContext,
} from "./editor-ordering";
import { editorStyles } from "./editor-styles";
import { entityLabel, localize, sectionLabel } from "./i18n";
import {
  checkedFromEvent,
  inputStringFromEvent,
  pickerValueFromEvent,
} from "./editor-shared";
import type {
  EntityDefinition,
  EntityKey,
  HomeAssistant,
  SectionId,
  UnifiDriveCardConfig,
} from "./types";

type ActionTextProperty = "navigation_path" | "url_path" | "service";
interface ActionField {
  key: ActionConfigKey;
  labelKey: string;
}

const ACTION_FIELDS: ActionField[] = [
  { key: "tap_action", labelKey: "editor.tap_action" },
  { key: "hold_action", labelKey: "editor.hold_action" },
  { key: "double_tap_action", labelKey: "editor.double_tap_action" },
];


@customElement("unifi-drive-card-editor")
export class UnifiDriveCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config = normalizeConfig({});

  public setConfig(config: UnifiDriveCardConfig): void {
    this._config = normalizeConfig(config);
  }

  protected override render() {
    const orderingContext = this._orderingContext();
    return html`
      <div class="editor">
        ${renderBasicEditor({
          hass: this.hass,
          config: this._config,
          deviceChanged: this._deviceChanged,
          entityChanged: this._entityChanged,
          nameChanged: this._nameChanged,
          numberChanged: (key, event) => this._numberChanged(key, event),
          checkboxChanged: (key, checked) => this._checkboxChanged(key, checked),
        })}
        ${renderSectionOrderEditor(orderingContext)}
        ${renderOverviewEntityEditor(orderingContext)}
        <section class="actions-editor">
          <h3>${localize(this.hass, "editor.actions")}</h3>
          <div class="action-list">
            ${ACTION_FIELDS.map((field) => this._actionField(field))}
          </div>
        </section>
        <section class="entity-editor">
          <h3>${localize(this.hass, "editor.entities")}</h3>
          ${DEFAULT_SECTIONS.map((section) => this._entitySection(section))}
        </section>
      </div>
    `;
  }

  private _orderingContext(): EditorOrderingContext {
    const activeEntityKeys = this._activeOverviewEntityKeys();
    return {
      hass: this.hass,
      sections: this._config.sections,
      overviewEntities: activeEntityKeys
        ? activeOverviewEntities(this._config.overview_entities, activeEntityKeys)
        : this._config.overview_entities,
      activeEntityKeys,
      toggleSection: (section, checked) => this._toggleSection(section, checked),
      moveSection: (section, direction) => this._moveSection(section, direction),
      reorderSection: (source, target) => this._reorderSection(source, target),
      toggleOverviewEntity: (key, checked) => this._overviewEntityChanged(key, checked),
      moveOverviewEntity: (key, direction) => this._moveOverviewEntity(key, direction),
      reorderOverviewEntity: (source, target) => this._reorderOverviewEntity(source, target),
    };
  }

  private _activeOverviewEntityKeys(): Set<EntityKey> | undefined {
    if (!this.hass) {
      return undefined;
    }
    return new Set(Object.keys(discoverEntities(this.hass, this._config).entityIds));
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
      <details class="entity-section">
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
        <div class="entity-visible switch-row">
          <ha-switch
            .checked=${!hidden}
            @change=${(event: Event) =>
              this._entityVisibilityChanged(definition.key, checkedFromEvent(event))}
          ></ha-switch>
          <button
            class="switch-label"
            type="button"
            @click=${() => this._entityVisibilityChanged(definition.key, hidden)}
          >
            ${entityLabel(definition, this.hass)}
          </button>
        </div>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${override}
          .includeDomains=${[definition.domain]}
          @value-changed=${(event: Event) =>
            this._entityOverrideChanged(definition, event)}
        ></ha-entity-picker>
      </div>
    `;
  }

  private _actionField(field: ActionField) {
    const action = this._config[field.key];
    const actionName = actionNameFromConfig(action, field.key);
    const open = actionCardOpen(field.key, action, actionName);
    return html`
      <details class="action-card" data-action-card-key=${field.key} ?open=${open}>
        <summary>
          <span>${localize(this.hass, field.labelKey)}</span>
          <small>${localize(this.hass, `editor.action.${actionName}`)}</small>
        </summary>
        <div class="action-fields">
          <label class="ha-form-row action-form-row">
            <span>${localize(this.hass, "editor.action_type")}</span>
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
                <label class="ha-form-row action-form-row">
                  <span>${localize(this.hass, "editor.action_entity")}</span>
                  <ha-entity-picker
                    data-action-key=${field.key}
                    data-action-property="entity"
                    .hass=${this.hass}
                    .value=${typeof action?.entity === "string" ? action.entity : ""}
                    @value-changed=${(event: Event) =>
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
      </details>
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
      <label class="ha-form-row action-form-row">
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
      <label class="ha-form-row action-form-row">
        <span>${localize(this.hass, "editor.service_target_entity")}</span>
        <ha-entity-picker
          data-action-key=${key}
          data-action-property="target_entity"
          .hass=${this.hass}
          .value=${targetFieldToString(action?.target, "entity_id")}
          @value-changed=${(event: Event) =>
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
      <label class="ha-form-row action-form-row">
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
      <label class="action-textarea-row">
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

  private _entityChanged = (event: Event): void => {
    this._updateConfig({ entity: pickerValueFromEvent(event) });
  };

  private _deviceChanged = (event: Event): void => {
    const deviceId = pickerValueFromEvent(event);
    this._updateConfig({ device_id: deviceId });
  };

  private _nameChanged = (event: Event): void => {
    this._updateConfig({ name: inputStringFromEvent(event) || undefined });
  };

  private _checkboxChanged(key: BasicBooleanConfigKey, checked: boolean): void {
    this._updateConfig({ [key]: checked });
  }

  private _numberChanged(key: BasicNumberConfigKey, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number.parseInt(target.value, 10);
    this._updateConfig({ [key]: value });
  }

  private _entityVisibilityChanged(key: EntityKey, checked: boolean): void {
    const hidden = new Set(this._config.hide_entities);
    if (checked) {
      hidden.delete(key);
    } else {
      hidden.add(key);
    }
    this._updateConfig({ hide_entities: [...hidden] });
  }

  private _entityOverrideChanged(definition: EntityDefinition, event: Event): void {
    this._updateConfig({
      entities: updateEntityOverride(
        this._config.entities,
        definition,
        pickerValueFromEvent(event),
      ),
    });
  }

  private _actionTypeChanged(key: ActionConfigKey, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._updateActionConfig(key, { action: target.value });
  }

  private _actionEntityChanged(key: ActionConfigKey, event: Event): void {
    this._updateActionConfig(key, { entity: pickerValueFromEvent(event) });
  }

  private _actionPropertyChanged(
    key: ActionConfigKey,
    property: ActionTextProperty,
    event: Event,
  ): void {
    const target = event.target as HTMLInputElement;
    if (property === "service") {
      this._updateActionConfig(key, {
        perform_action: target.value || undefined,
        service: target.value || undefined,
      });
      return;
    }
    this._updateActionConfig(key, { [property]: target.value || undefined });
  }

  private _actionTargetEntityChanged(key: ActionConfigKey, event: Event): void {
    this._updateActionTarget(key, "entity_id", pickerValueFromEvent(event));
  }

  private _actionTargetTextChanged(
    key: ActionConfigKey,
    field: Exclude<ActionTargetField, "entity_id">,
    event: Event,
  ): void {
    const target = event.target as HTMLInputElement;
    this._updateActionTarget(key, field, target.value);
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

  private _toggleSection(section: SectionId, checked: boolean): void {
    this._updateConfig({
      sections: toggleListItem(this._config.sections, section, checked),
    });
  }

  private _moveSection(section: SectionId, direction: -1 | 1): void {
    this._updateConfig({ sections: moveItem(this._config.sections, section, direction) });
  }

  private _reorderSection(source: SectionId, target: SectionId): void {
    this._updateConfig({ sections: reorderItem(this._config.sections, source, target) });
  }

  private _overviewEntityChanged(key: EntityKey, checked: boolean): void {
    this._updateConfig({
      overview_entities: toggleListItem(this._config.overview_entities, key, checked),
    });
  }

  private _moveOverviewEntity(key: EntityKey, direction: -1 | 1): void {
    const activeEntityKeys = this._activeOverviewEntityKeys();
    const overview_entities = moveActiveOverviewEntity(
      this._config.overview_entities,
      key,
      direction,
      activeEntityKeys,
    );
    this._updateConfig({ overview_entities });
  }

  private _reorderOverviewEntity(source: EntityKey, target: EntityKey): void {
    const activeEntityKeys = this._activeOverviewEntityKeys();
    const overview_entities = reorderActiveOverviewEntity(
      this._config.overview_entities,
      source,
      target,
      activeEntityKeys,
    );
    this._updateConfig({ overview_entities });
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

function definitionsForSection(section: SectionId): EntityDefinition[] {
  return ENTITY_DEFINITIONS.filter(
    (definition) => !definition.dynamic && definition.section === section,
  );
}

function actionCardOpen(
  key: ActionConfigKey,
  action: UnifiDriveCardConfig["tap_action"],
  actionName: string,
): boolean {
  if (key !== "tap_action") {
    return actionName !== "none";
  }
  if (!action) {
    return false;
  }
  const keys = Object.keys(action);
  return !(action.action === "more-info" && keys.length === 1);
}

function entityOverride(
  entities: NonNullable<UnifiDriveCardConfig["entities"]>,
  definition: EntityDefinition,
): string {
  const direct = entities[definition.key];
  if (typeof direct === "string") {
    return direct;
  }
  const domainOverrides = entities[definition.domain];
  if (domainOverrides && typeof domainOverrides === "object" && !Array.isArray(domainOverrides)) {
    const nested = domainOverrides[definition.key];
    return typeof nested === "string" ? nested : "";
  }
  return "";
}

function updateEntityOverride(
  entities: NonNullable<UnifiDriveCardConfig["entities"]>,
  definition: EntityDefinition,
  entityId: string | undefined,
): NonNullable<UnifiDriveCardConfig["entities"]> {
  const next = { ...entities };
  const domainOverrides = next[definition.domain];
  if (domainOverrides && typeof domainOverrides === "object" && !Array.isArray(domainOverrides)) {
    const nested = { ...domainOverrides };
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
