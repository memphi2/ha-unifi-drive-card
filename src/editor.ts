import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import {
  DEFAULT_SECTIONS,
  DIAGNOSTIC_KEYS,
  ENTITY_DEFINITION_BY_KEY,
  ENTITY_DEFINITIONS_BY_SECTION,
  STORAGE_KEYS,
  SYSTEM_KEYS,
  UPDATE_KEYS,
} from "./catalog";
import { normalizeConfig } from "./config";
import { DiscoveryCache } from "./discovery-cache";
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
} from "./editor-basic";
import {
  activeOverviewEntities,
  reorderActiveOverviewEntity,
  reorderItem,
  renderOverviewEntityEditor,
  renderSectionOrderEditor,
  toggleListItem,
  type EditorOrderingContext,
} from "./editor-ordering";
import { editorStyles } from "./editor-styles";
import { entityLabel, localize } from "./i18n";
import {
  checkedFromEvent,
  inputStringFromEvent,
  pickerValueFromEvent,
  textValueFromEvent,
} from "./editor-shared";
import type {
  DiscoveredEntities,
  EntityDomain,
  EntityDefinition,
  EntityKey,
  HomeAssistant,
  Renderable,
  SectionId,
  UnifiDriveCardConfig,
} from "./types";
import { editorFoldout, formRow, switchFormField, textareaRow } from "./editor-form";

type ActionTextProperty = "navigation_path" | "url_path" | "service";
interface ActionField {
  key: ActionConfigKey;
  labelKey: string;
}
interface SectionEntityGroups {
  availableDefinitions: EntityDefinition[];
  selected: Set<EntityKey>;
  selectedDefinitions: EntityDefinition[];
  selectedOrder: EntityKey[];
}

const ACTION_FIELDS: ActionField[] = [
  { key: "tap_action", labelKey: "editor.tap_action" },
  { key: "hold_action", labelKey: "editor.hold_action" },
  { key: "double_tap_action", labelKey: "editor.double_tap_action" },
];
const ENTITY_EDITOR_SECTIONS = DEFAULT_SECTIONS.filter(
  (section) => section !== "overview",
) satisfies SectionId[];
const ENTITY_EDITOR_SECTION_SET = new Set<SectionId>(ENTITY_EDITOR_SECTIONS);
const SECTION_CATALOG_KEYS: Partial<Record<SectionId, EntityKey[]>> = Object.fromEntries(
  Object.entries(ENTITY_DEFINITIONS_BY_SECTION).map(([section, definitions]) => [
    section,
    definitions
      .filter((definition) => !definition.dynamic)
      .map((definition) => definition.key),
  ]),
) as Partial<Record<SectionId, EntityKey[]>>;

const SECTION_ENTITY_DRAG_TYPE = "application/x-unifi-drive-section-entity";
const PRIMITIVE_CONFIG_KEYS = [
  "type",
  "device_id",
  "name",
  "compact",
  "show_unavailable",
  "show_optional",
  "show_diagnostics",
  "show_dangerous_actions",
  "show_icon_animations",
  "show_display_buttons",
  "overview_columns",
] as const satisfies readonly (keyof UnifiDriveCardConfig)[];
const ARRAY_CONFIG_KEYS = [
  "sections",
  "overview_entities",
  "hide_entities",
] as const satisfies readonly (keyof UnifiDriveCardConfig)[];
const JSON_CONFIG_KEYS = [
  "entities",
  "section_entity_order",
  "tap_action",
  "hold_action",
  "double_tap_action",
] as const satisfies readonly (keyof UnifiDriveCardConfig)[];
const SECTION_DEFAULT_KEY_ORDER: Partial<Record<SectionId, EntityKey[]>> = {
  diagnostics: DIAGNOSTIC_KEYS,
  storage: STORAGE_KEYS,
  system: SYSTEM_KEYS,
  updates: UPDATE_KEYS,
};
const DANGEROUS_ENTITY_KEYS = new Set<EntityKey>(
  Object.values(ENTITY_DEFINITION_BY_KEY)
    .filter((definition) => definition.dangerous)
    .map((definition) => definition.key),
);


@customElement("unifi-drive-card-editor")
export class UnifiDriveCardEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config = normalizeConfig({});
  private readonly _activeEntityKeysCache = new WeakMap<DiscoveredEntities, Set<EntityKey>>();
  private readonly _discoveryCache = new DiscoveryCache();
  private _entityOverrideKeyCache?: {
    source: NonNullable<UnifiDriveCardConfig["entities"]>;
    keys: Set<EntityKey>;
  };

  public setConfig(config: UnifiDriveCardConfig): void {
    this._config = normalizeConfig(config);
    this._entityOverrideKeyCache = undefined;
  }

  public override disconnectedCallback(): void {
    this._discoveryCache.clear();
    this._entityOverrideKeyCache = undefined;
    super.disconnectedCallback();
  }

  protected override render() {
    const activeEntityKeys = this._activeEntityKeys();
    const hiddenEntityKeys = this._effectiveHiddenEntityKeys();
    const pinnedEntityKeys = this._pinnedEntityKeys(hiddenEntityKeys);
    const orderingContext = this._orderingContext(activeEntityKeys);
    return html`
      <div class="editor">
        ${renderBasicEditor({
          hass: this.hass,
          config: this._config,
          devicePreviewLabel: this._devicePreviewLabel(),
          devicePreviewReady: activeEntityKeys !== undefined,
          deviceChanged: this._deviceChanged,
          nameChanged: this._nameChanged,
          checkboxChanged: (key, checked) => this._checkboxChanged(key, checked),
        })}
        <section class="actions-editor">
          ${editorFoldout(this.hass, {
            className: "actions-foldout",
            titleKey: "section.actions",
            helpKey: "editor.actions_help",
            content: html`
              <div class="action-list">
                ${ACTION_FIELDS.map((field) => this._actionField(field))}
              </div>
            `,
          })}
        </section>
        ${renderSectionOrderEditor(orderingContext)}
        ${renderOverviewEntityEditor(orderingContext)}
        <section class="entity-editor section-entities-editor">
          ${this._orderedEntityEditorSections().map((section) =>
            this._sectionEntitySelector(
              section,
              hiddenEntityKeys,
              pinnedEntityKeys,
              activeEntityKeys,
            ),
          )}
        </section>
      </div>
    `;
  }

  private _devicePreviewLabel(): string | undefined {
    const deviceId = this._config.device_id;
    if (!deviceId) {
      return undefined;
    }
    const device = this.hass?.devices?.[deviceId];
    return device?.name_by_user || device?.name || undefined;
  }

  private _orderingContext(activeEntityKeys: Set<EntityKey> | undefined): EditorOrderingContext {
    return {
      hass: this.hass,
      sections: this._config.sections,
      overviewEntities: activeEntityKeys
        ? activeOverviewEntities(this._config.overview_entities, activeEntityKeys)
        : this._config.overview_entities,
      activeEntityKeys,
      toggleSection: (section, checked) => this._toggleSection(section, checked),
      reorderSection: (source, target) => this._reorderSection(source, target),
      toggleOverviewEntity: (key, checked) => this._overviewEntityChanged(key, checked),
      reorderOverviewEntity: (source, target) =>
        this._reorderOverviewEntity(source, target, activeEntityKeys),
    };
  }

  private _activeEntityKeys(): Set<EntityKey> | undefined {
    if (!this.hass) {
      return undefined;
    }
    const discovered = this._discoveryCache.get(this.hass, this._config);
    const cached = this._activeEntityKeysCache.get(discovered);
    if (cached) {
      return cached;
    }
    const keys = new Set(Object.keys(discovered.entityIds));
    this._activeEntityKeysCache.set(discovered, keys);
    return keys;
  }

  private _orderedEntityEditorSections(): SectionId[] {
    return this._config.sections.filter(
      (section): section is SectionId =>
        section !== "overview" && ENTITY_EDITOR_SECTION_SET.has(section),
    );
  }

  private _sectionEntitySelector(
    section: SectionId,
    hiddenEntityKeys: Set<EntityKey>,
    pinnedEntityKeys: ReadonlySet<EntityKey>,
    activeEntityKeys?: Set<EntityKey>,
  ) {
    const definitions = this._orderedSectionEntityDefinitions(
      section,
      pinnedEntityKeys,
      activeEntityKeys,
    );
    if (!definitions.length) {
      return nothing;
    }
    const {
      selectedDefinitions,
      availableDefinitions,
      selectedOrder,
      selected,
    } = this._sectionEntityGroups(definitions, hiddenEntityKeys);
    return editorFoldout(this.hass, {
      className: `overview-foldout entity-section entity-section-${section}`,
      titleKey: `section.${section}`,
      count: selectedDefinitions.length,
      content: html`
        <div class="overview-entity-groups section-entity-groups">
          ${this._sectionEntityDefinitionGroup(
            section,
            "editor.selected_section_entities",
            selectedDefinitions,
            selected,
            selectedOrder,
            "order-list overview-order-list",
          )}
          ${this._sectionEntityDefinitionGroup(
            section,
            "editor.available_section_entities",
            availableDefinitions,
            selected,
            selectedOrder,
            "overview-entity-grid",
          )}
        </div>
      `,
    });
  }

  private _sectionEntityGroups(
    definitions: EntityDefinition[],
    hiddenEntityKeys: Set<EntityKey>,
  ): SectionEntityGroups {
    const selectedDefinitions: EntityDefinition[] = [];
    const availableDefinitions: EntityDefinition[] = [];
    for (const definition of definitions) {
      if (hiddenEntityKeys.has(definition.key)) {
        availableDefinitions.push(definition);
      } else {
        selectedDefinitions.push(definition);
      }
    }
    const selectedOrder = selectedDefinitions.map((definition) => definition.key);
    return {
      selectedDefinitions,
      availableDefinitions,
      selectedOrder,
      selected: new Set(selectedOrder),
    };
  }

  private _sectionEntityDefinitionGroup(
    section: SectionId,
    titleKey: string,
    definitions: EntityDefinition[],
    selected: Set<EntityKey>,
    selectedOrder: EntityKey[],
    listClassName: string,
  ): Renderable {
    if (!definitions.length) {
      return nothing;
    }
    return editorFoldout(this.hass, {
      className: "overview-entity-section",
      titleKey,
      count: definitions.length,
      content: html`
        <div class=${listClassName}>
          ${repeat(
            definitions,
            (definition) => definition.key,
            (definition) =>
              this._sectionEntityToggle(section, definition, selected, selectedOrder),
          )}
        </div>
      `,
    });
  }

  private _orderedSectionEntityDefinitions(
    section: SectionId,
    pinnedEntityKeys?: ReadonlySet<EntityKey>,
    activeEntityKeys?: ReadonlySet<EntityKey>,
  ): EntityDefinition[] {
    const configuredOrder = this._config.section_entity_order[section];
    const configuredKeys = configuredOrder?.length ? new Set(configuredOrder) : undefined;
    const definitions = definitionsForSection(section).filter(
      (definition) =>
        !activeEntityKeys ||
        activeEntityKeys.has(definition.key) ||
        pinnedEntityKeys?.has(definition.key) ||
        configuredKeys?.has(definition.key),
    );
    if (!definitions.length) {
      return [];
    }
    const byKey = new Map(definitions.map((definition) => [definition.key, definition] as const));
    const sectionCatalogKeys = SECTION_CATALOG_KEYS[section] ?? [];
    const preferredDefaults = sectionDefaultKeys(section, sectionCatalogKeys).filter((key) =>
      byKey.has(key),
    );
    const preferredSet = new Set(preferredDefaults);
    const baseDefinitions = [
      ...preferredDefaults
        .map((key) => byKey.get(key))
        .filter((definition): definition is EntityDefinition => Boolean(definition)),
      ...definitions.filter((definition) => !preferredSet.has(definition.key)),
    ];
    if (!configuredOrder?.length) {
      return baseDefinitions;
    }
    const ordered = configuredOrder
      .map((key) => byKey.get(key))
      .filter((definition): definition is EntityDefinition => Boolean(definition));
    const orderedKeys = new Set(ordered.map((definition) => definition.key));
    return [...ordered, ...baseDefinitions.filter((definition) => !orderedKeys.has(definition.key))];
  }

  private _entityOverrideKeys(): Set<EntityKey> {
    const source = this._config.entities;
    if (this._entityOverrideKeyCache?.source === source) {
      return this._entityOverrideKeyCache.keys;
    }
    const keys = new Set<EntityKey>();
    for (const [entryKey, value] of Object.entries(source)) {
      if (typeof value === "string" && ENTITY_DEFINITION_BY_KEY[entryKey]) {
        keys.add(entryKey as EntityKey);
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        continue;
      }
      for (const nestedKey of Object.keys(value)) {
        if (ENTITY_DEFINITION_BY_KEY[nestedKey]) {
          keys.add(nestedKey as EntityKey);
        }
      }
    }
    this._entityOverrideKeyCache = { source, keys };
    return keys;
  }

  private _sectionEntityToggle(
    section: SectionId,
    definition: EntityDefinition,
    selected: Set<EntityKey>,
    selectedOrder: EntityKey[],
  ) {
    const checked = selected.has(definition.key);
    const override = entityOverride(this._config.entities, definition);
    const dragLabel = localize(this.hass, "editor.drag_to_reorder");
    return html`
      <div
        class="overview-entity-toggle section-entity-toggle"
        data-entity-key=${definition.key}
        data-entity-section=${section}
        @dragover=${(event: DragEvent) => (checked ? this._allowEntityDrop(event) : undefined)}
        @drop=${(event: DragEvent) =>
          checked ? this._dropSectionEntity(section, definition.key, event) : undefined}
      >
        <div class="check switch-row">
          ${switchFormField(
            this.hass,
            entityLabel(definition, this.hass),
            checked,
            (event: Event) =>
              this._entityVisibilityChanged(definition.key, checkedFromEvent(event)),
            {
              helpKey: "editor.overview_entity_visibility_help",
              isLocalizedText: true,
            },
          )}
        </div>
        ${this._renderSectionEntityDragHandle(
          checked,
          section,
          definition.key,
          selectedOrder,
          dragLabel,
        )}
        ${this._renderSectionEntityOverride(definition, override)}
      </div>
    `;
  }

  private _renderSectionEntityDragHandle(
    checked: boolean,
    section: SectionId,
    key: EntityKey,
    selectedOrder: EntityKey[],
    dragLabel: string,
  ): Renderable {
    if (!checked) {
      return nothing;
    }
    return html`
      <div class="order-actions">
        <button
          class="drag-handle"
          type="button"
          title=${dragLabel}
          aria-label=${dragLabel}
          aria-keyshortcuts="ArrowUp ArrowDown"
          draggable="true"
          @dragstart=${(event: DragEvent) => this._setSectionEntityDragData(event, key)}
          @keydown=${(event: KeyboardEvent) =>
            this._reorderSectionEntityByKeyboard(event, section, key, selectedOrder)}
        >
          <ha-icon icon="mdi:drag"></ha-icon>
        </button>
      </div>
    `;
  }

  private _renderSectionEntityOverride(
    definition: EntityDefinition,
    override: string,
  ): Renderable {
    const overridePreview = typeof override === "string" ? override : "";
    return html`
      <div class="entity-override-control entity-override-inline">
        ${domainEntityPicker(
          this.hass,
          definition,
          override,
          (event: Event) => this._entityOverrideChanged(definition, event),
        )}
        <ha-textfield
          .value=${overridePreview}
          .label=${localize(this.hass, "editor.entity_override_custom")}
          .helper=${localize(this.hass, "editor.entity_override_custom_help")}
          helperPersistent
          @change=${(event: Event) => this._entityOverrideTextChanged(definition, event)}
        ></ha-textfield>
      </div>
    `;
  }

  private _actionField(field: ActionField) {
    const action = this._config[field.key];
    const actionName = actionNameFromConfig(action, field.key);
    const open = actionCardOpen(field.key, action, actionName);
    return html`
      <details class="editor-foldout action-card" data-action-card-key=${field.key} ?open=${open}>
        <summary>
          <span class="summary-label">
            <span>${localize(this.hass, field.labelKey)}</span>
          </span>
          <small>${localize(this.hass, `editor.action.${actionName}`)}</small>
        </summary>
        <div class="action-fields">
          ${formRow(
            this.hass,
            "editor.action_type",
            undefined,
            html`
              <select
                data-action-key=${field.key}
                .value=${actionName}
                aria-label=${localize(this.hass, "editor.action_type")}
                @change=${(event: Event) => this._actionTypeChanged(field.key, event)}
              >
                ${ACTION_OPTIONS.map(
                  (option) =>
                    html`<option value=${option} ?selected=${option === actionName}>
                      ${localize(this.hass, `editor.action.${option}`)}
                    </option>`,
                )}
              </select>
            `,
            "action-form-row",
          )}
          ${actionName !== "none"
            ? html`
                ${formRow(
                  this.hass,
                  "editor.action_entity",
                  undefined,
                  html`
                    <ha-entity-picker
                      data-action-key=${field.key}
                      data-action-property="entity"
                      .hass=${this.hass}
                      .value=${typeof action?.entity === "string" ? action.entity : ""}
                      aria-label=${localize(this.hass, "editor.action_entity")}
                      @value-changed=${(event: Event) =>
                        this._actionEntityChanged(field.key, event)}
                    ></ha-entity-picker>
                  `,
                  "action-form-row",
                )}
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
    return formRow(
      this.hass,
      labelKey,
      undefined,
      html`
        <ha-textfield
          data-action-key=${key}
          data-action-property=${property}
          .value=${typeof value === "string" ? value : ""}
          aria-label=${localize(this.hass, labelKey)}
          @input=${(event: Event) => this._actionPropertyChanged(key, property, event)}
        ></ha-textfield>
      `,
      "action-form-row",
    );
  }

  private _actionTargetEntityField(key: ActionConfigKey) {
    const action = this._config[key];
    return formRow(
      this.hass,
      "editor.service_target_entity",
      undefined,
      html`
        <ha-entity-picker
          data-action-key=${key}
          data-action-property="target_entity"
          .hass=${this.hass}
          .value=${targetFieldToString(action?.target, "entity_id")}
          aria-label=${localize(this.hass, "editor.service_target_entity")}
          @value-changed=${(event: Event) =>
            this._actionTargetEntityChanged(key, event)}
        ></ha-entity-picker>
      `,
      "action-form-row",
    );
  }

  private _actionTargetTextField(
    key: ActionConfigKey,
    field: Exclude<ActionTargetField, "entity_id">,
    labelKey: string,
  ) {
    const action = this._config[key];
    return formRow(
      this.hass,
      labelKey,
      undefined,
      html`
        <ha-textfield
          data-action-key=${key}
          data-action-property=${`target_${field}`}
          .value=${targetFieldToString(action?.target, field)}
          aria-label=${localize(this.hass, labelKey)}
          @input=${(event: Event) => this._actionTargetTextChanged(key, field, event)}
        ></ha-textfield>
      `,
      "action-form-row",
    );
  }

  private _actionDataField(key: ActionConfigKey) {
    const action = this._config[key];
    return textareaRow(
      this.hass,
      "editor.service_data",
      undefined,
      html`
        <ha-textarea
          data-action-key=${key}
          data-action-property="data"
          .value=${formatActionData(action?.data)}
          aria-label=${localize(this.hass, "editor.service_data")}
          helperPersistent
          @input=${(event: Event) => this._actionDataChanged(key, event)}
        ></ha-textarea>
      `,
    );
  }

  private _deviceChanged = (event: Event): void => {
    const deviceId = pickerValueFromEvent(event);
    if (!deviceId) {
      return;
    }
    this._updateConfig({ device_id: deviceId });
  };

  private _nameChanged = (event: Event): void => {
    this._updateConfig({ name: textValueFromEvent(event) || undefined });
  };

  private _checkboxChanged(key: BasicBooleanConfigKey, checked: boolean): void {
    this._updateConfig({ [key]: checked });
  }

  private _entityVisibilityChanged(key: EntityKey, checked: boolean): void {
    const hidden = new Set(this._config.hide_entities);
    const enableDangerousActions =
      checked && DANGEROUS_ENTITY_KEYS.has(key) && !this._config.show_dangerous_actions;
    if (enableDangerousActions) {
      for (const dangerousKey of DANGEROUS_ENTITY_KEYS) {
        hidden.add(dangerousKey);
      }
    }
    if (checked) {
      hidden.delete(key);
    } else {
      hidden.add(key);
    }
    this._updateConfig({
      hide_entities: [...hidden],
      show_dangerous_actions: enableDangerousActions
        ? true
        : this._config.show_dangerous_actions,
    });
  }

  private _setSectionEntityDragData(event: DragEvent, key: EntityKey): void {
    event.dataTransfer?.setData(SECTION_ENTITY_DRAG_TYPE, key);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  private _allowEntityDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  private _dropSectionEntity(section: SectionId, target: EntityKey, event: DragEvent): void {
    event.preventDefault();
    const source = event.dataTransfer?.getData(SECTION_ENTITY_DRAG_TYPE) as
      | EntityKey
      | undefined;
    if (!source) {
      return;
    }
    this._reorderSectionEntity(section, source, target);
  }

  private _reorderSectionEntityByKeyboard(
    event: KeyboardEvent,
    section: SectionId,
    current: EntityKey,
    orderedKeys: EntityKey[],
  ): void {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const index = orderedKeys.indexOf(current);
    if (index < 0) {
      return;
    }
    const delta = event.key === "ArrowUp" ? -1 : 1;
    const target = orderedKeys[index + delta];
    if (!target) {
      return;
    }
    this._reorderSectionEntity(section, current, target);
  }

  private _reorderSectionEntity(section: SectionId, source: EntityKey, target: EntityKey): void {
    const current = this._orderedSectionEntityDefinitions(
      section,
      this._pinnedEntityKeys(),
      this._activeEntityKeys(),
    ).map((definition) => definition.key);
    const next = reorderItem(current, source, target);
    this._setSectionEntityOrder(section, current, next);
  }

  private _setSectionEntityOrder(
    section: SectionId,
    current: EntityKey[],
    next: EntityKey[],
  ): void {
    if (sameStringList(current, next)) {
      return;
    }
    const defaults = sectionDefaultKeys(
      section,
      SECTION_CATALOG_KEYS[section] ?? [],
    );
    const section_entity_order = { ...this._config.section_entity_order };
    if (sameStringList(next, defaults)) {
      delete section_entity_order[section];
    } else {
      section_entity_order[section] = next;
    }
    this._updateConfig({ section_entity_order });
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

  private _entityOverrideTextChanged(definition: EntityDefinition, event: Event): void {
    this._updateConfig({
      entities: updateEntityOverride(
        this._config.entities,
        definition,
        inputStringFromEvent(event) || undefined,
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
    const value = inputStringFromEvent(event);
    if (property === "service") {
      this._updateActionConfig(key, {
        perform_action: value || undefined,
        service: value || undefined,
      });
      return;
    }
    this._updateActionConfig(key, { [property]: value || undefined });
  }

  private _actionTargetEntityChanged(key: ActionConfigKey, event: Event): void {
    this._updateActionTarget(key, "entity_id", pickerValueFromEvent(event));
  }

  private _actionTargetTextChanged(
    key: ActionConfigKey,
    field: Exclude<ActionTargetField, "entity_id">,
    event: Event,
  ): void {
    this._updateActionTarget(key, field, inputStringFromEvent(event));
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
    const target = event.target as HTMLElement & { value?: unknown };
    const parsed = parseActionData(typeof target.value === "string" ? target.value : "");
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

  private _reorderSection(source: SectionId, target: SectionId): void {
    this._updateConfig({ sections: reorderItem(this._config.sections, source, target) });
  }

  private _overviewEntityChanged(key: EntityKey, checked: boolean): void {
    this._updateConfig({
      overview_entities: toggleListItem(this._config.overview_entities, key, checked),
    });
  }

  private _reorderOverviewEntity(
    source: EntityKey,
    target: EntityKey,
    activeEntityKeys?: Set<EntityKey>,
  ): void {
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
    if (configsEqual(this._config, next)) {
      return;
    }
    this._config = next;
    this._emitConfigChanged(next);
  }

  private _emitConfigChanged(config: UnifiDriveCardConfig): void {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _pinnedEntityKeys(
    hiddenEntityKeys = new Set(this._config.hide_entities),
  ): Set<EntityKey> {
    return new Set<EntityKey>([...hiddenEntityKeys, ...this._entityOverrideKeys()]);
  }

  private _effectiveHiddenEntityKeys(): Set<EntityKey> {
    const hidden = new Set(this._config.hide_entities);
    if (!this._config.show_dangerous_actions) {
      for (const key of DANGEROUS_ENTITY_KEYS) {
        hidden.add(key);
      }
    }
    return hidden;
  }

  static override styles = editorStyles;
}

function definitionsForSection(section: SectionId): EntityDefinition[] {
  return (ENTITY_DEFINITIONS_BY_SECTION[section] ?? []).filter((definition) => !definition.dynamic);
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

function domainEntitySelector(domain: EntityDomain) {
  const cached = DOMAIN_ENTITY_SELECTOR_CACHE.get(domain);
  if (cached) {
    return cached;
  }
  const selector: DomainEntitySelector = {
    entity: {
      filter: [{ domain }],
    },
  };
  DOMAIN_ENTITY_SELECTOR_CACHE.set(domain, selector);
  return selector;
}

function domainEntityPicker(
  hass: HomeAssistant | undefined,
  definition: EntityDefinition,
  value: string,
  onValueChanged: (event: Event) => void,
) {
  if (supportsHaSelector()) {
    return html`
      <ha-selector
        class="ha-picker-control"
        .hass=${hass}
        .value=${value}
        .selector=${domainEntitySelector(definition.domain)}
        @value-changed=${onValueChanged}
      ></ha-selector>
    `;
  }
  return html`
    <ha-entity-picker
      class="ha-picker-control"
      .hass=${hass}
      .value=${value}
      .includeDomains=${[definition.domain]}
      @value-changed=${onValueChanged}
    ></ha-entity-picker>
  `;
}

function supportsHaSelector(): boolean {
  return typeof customElements !== "undefined" && Boolean(customElements.get("ha-selector"));
}

function sectionDefaultKeys(section: SectionId, sectionCatalogKeys: EntityKey[]): EntityKey[] {
  const preferred = SECTION_DEFAULT_KEY_ORDER[section] ?? [];
  const preferredSet = new Set(preferred);
  const knownCatalogKeys = new Set(sectionCatalogKeys);
  const inSectionPreferred = preferred.filter((key) => knownCatalogKeys.has(key));
  const remaining = sectionCatalogKeys.filter((key) => !preferredSet.has(key));
  return [...inSectionPreferred, ...remaining];
}

function sameStringList(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function configsEqual(left: UnifiDriveCardConfig, right: UnifiDriveCardConfig): boolean {
  if (left === right) {
    return true;
  }
  for (const key of PRIMITIVE_CONFIG_KEYS) {
    if (left[key] !== right[key]) {
      return false;
    }
  }
  for (const key of ARRAY_CONFIG_KEYS) {
    if (
      !sameStringList(
        (left[key] as string[] | undefined) ?? [],
        (right[key] as string[] | undefined) ?? [],
      )
    ) {
      return false;
    }
  }
  for (const key of JSON_CONFIG_KEYS) {
    if (left[key] !== right[key] && !jsonEquals(left[key], right[key])) {
      return false;
    }
  }
  return true;
}

function jsonEquals(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

type DomainEntitySelector = { entity: { filter: Array<{ domain: EntityDomain }> } };
const DOMAIN_ENTITY_SELECTOR_CACHE = new Map<EntityDomain, DomainEntitySelector>();
