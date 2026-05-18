import { html } from "lit";
import { DEFAULT_SECTIONS, ENTITY_DEFINITIONS } from "./catalog";
import { entityLabel, localize, sectionLabel } from "./i18n";
import type { EntityDefinition, EntityKey, HomeAssistant, SectionId } from "./types";

export interface EditorOrderingContext {
  hass?: HomeAssistant;
  sections: SectionId[];
  overviewEntities: EntityKey[];
  activeEntityKeys?: Set<EntityKey>;
  toggleSection: (section: SectionId, checked: boolean) => void;
  moveSection: (section: SectionId, direction: -1 | 1) => void;
  reorderSection: (source: SectionId, target: SectionId) => void;
  toggleOverviewEntity: (key: EntityKey, checked: boolean) => void;
  moveOverviewEntity: (key: EntityKey, direction: -1 | 1) => void;
  reorderOverviewEntity: (source: EntityKey, target: EntityKey) => void;
}

const SECTION_DRAG_TYPE = "application/x-unifi-drive-section";
const OVERVIEW_DRAG_TYPE = "application/x-unifi-drive-overview-entity";

export function renderSectionOrderEditor(context: EditorOrderingContext) {
  const sections = orderedSectionsForEditor(context.sections);
  return html`
    <section class="sections-editor">
      <h3>${localize(context.hass, "editor.sections")}</h3>
      <p>${localize(context.hass, "editor.sections_help")}</p>
      <div class="order-list section-order-list">
        ${sections.map((section) => sectionToggle(context, section))}
      </div>
    </section>
  `;
}

export function renderOverviewEntityEditor(context: EditorOrderingContext) {
  const activeDefinitions = entityDefinitionsForOverview(context.activeEntityKeys);
  const selectedDefinitions = selectedEntityDefinitions(
    context.overviewEntities,
    activeDefinitions,
  );
  const selected = new Set(selectedDefinitions.map((definition) => definition.key));
  const availableDefinitions = activeDefinitions.filter(
    (definition) => !selected.has(definition.key),
  );
  return html`
    <section class="overview-editor">
      <h3>${localize(context.hass, "editor.overview_entities")}</h3>
      <p>${localize(context.hass, "editor.overview_entities_help")}</p>
      <div class="overview-entity-groups">
        ${selectedDefinitions.length
          ? html`
              <details class="overview-entity-section">
                <summary>
                  <span>${localize(context.hass, "editor.selected_overview_entities")}</span>
                  <small>${selectedDefinitions.length}</small>
                </summary>
                <div class="order-list overview-order-list">
                  ${selectedDefinitions.map((definition) =>
                    overviewEntityToggle(context, definition, selected),
                  )}
                </div>
              </details>
            `
          : ""}
        ${availableDefinitions.length
          ? html`
              <details class="overview-entity-section">
                <summary>
                  <span>${localize(context.hass, "editor.available_overview_entities")}</span>
                  <small>${availableDefinitions.length}</small>
                </summary>
                <div class="overview-entity-grid">
                  ${availableDefinitions.map((definition) =>
                    overviewEntityToggle(context, definition, selected),
                  )}
                </div>
              </details>
            `
          : ""}
      </div>
    </section>
  `;
}

export function toggleListItem<T>(items: T[], item: T, enabled: boolean): T[] {
  if (enabled) {
    return items.includes(item) ? [...items] : [...items, item];
  }
  return items.filter((entry) => entry !== item);
}

export function moveItem<T>(items: T[], item: T, direction: -1 | 1): T[] {
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

function sectionToggle(context: EditorOrderingContext, section: SectionId) {
  const checked = context.sections.includes(section);
  const selectedIndex = context.sections.indexOf(section);
  return html`
    <div
      class="order-row section-order-row"
      data-section-key=${section}
      @dragover=${(event: DragEvent) => allowDrop(event, checked)}
      @drop=${(event: DragEvent) => dropSection(context, section, checked, event)}
    >
      <div class="check switch-row">
        <ha-switch
          .checked=${checked}
          @change=${(event: Event) =>
            context.toggleSection(section, checkedFromEvent(event))}
        ></ha-switch>
        <button
          class="switch-label"
          type="button"
          @click=${() => context.toggleSection(section, !checked)}
        >
          ${sectionLabel(section, context.hass)}
        </button>
      </div>
      <div class="order-actions">
        <button
          class="icon-button"
          type="button"
          title=${localize(context.hass, "editor.move_up")}
          aria-label=${localize(context.hass, "editor.move_up")}
          ?disabled=${!checked || selectedIndex <= 0}
          @click=${() => context.moveSection(section, -1)}
        >
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </button>
        <button
          class="icon-button"
          type="button"
          title=${localize(context.hass, "editor.move_down")}
          aria-label=${localize(context.hass, "editor.move_down")}
          ?disabled=${!checked || selectedIndex < 0 || selectedIndex >= context.sections.length - 1}
          @click=${() => context.moveSection(section, 1)}
        >
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </button>
        <button
          class="drag-handle"
          type="button"
          title=${localize(context.hass, "editor.drag_to_reorder")}
          aria-label=${localize(context.hass, "editor.drag_to_reorder")}
          draggable=${checked ? "true" : "false"}
          ?disabled=${!checked}
          @dragstart=${(event: DragEvent) =>
            setDragData(event, SECTION_DRAG_TYPE, section)}
        >
          <ha-icon icon="mdi:drag"></ha-icon>
        </button>
      </div>
    </div>
  `;
}

function overviewEntityToggle(
  context: EditorOrderingContext,
  definition: EntityDefinition,
  selected: Set<EntityKey>,
) {
  const checked = selected.has(definition.key);
  const selectedIndex = context.overviewEntities.indexOf(definition.key);
  return html`
    <div
      class="overview-entity-toggle"
      data-overview-key=${definition.key}
      @dragover=${(event: DragEvent) => allowDrop(event, checked)}
      @drop=${(event: DragEvent) =>
        dropOverviewEntity(context, definition.key, checked, event)}
    >
      <div class="check switch-row">
        <ha-switch
          .checked=${checked}
          @change=${(event: Event) =>
            context.toggleOverviewEntity(definition.key, checkedFromEvent(event))}
        ></ha-switch>
        <button
          class="switch-label"
          type="button"
          @click=${() => context.toggleOverviewEntity(definition.key, !checked)}
        >
          ${entityLabel(definition, context.hass)}
        </button>
      </div>
      ${checked
        ? html`
            <div class="order-actions">
              <button
                class="icon-button"
                type="button"
                title=${localize(context.hass, "editor.move_up")}
                aria-label=${localize(context.hass, "editor.move_up")}
                ?disabled=${selectedIndex <= 0}
                @click=${() => context.moveOverviewEntity(definition.key, -1)}
              >
                <ha-icon icon="mdi:chevron-up"></ha-icon>
              </button>
              <button
                class="icon-button"
                type="button"
                title=${localize(context.hass, "editor.move_down")}
                aria-label=${localize(context.hass, "editor.move_down")}
                ?disabled=${selectedIndex >= context.overviewEntities.length - 1}
                @click=${() => context.moveOverviewEntity(definition.key, 1)}
              >
                <ha-icon icon="mdi:chevron-down"></ha-icon>
              </button>
              <button
                class="drag-handle"
                type="button"
                title=${localize(context.hass, "editor.drag_to_reorder")}
                aria-label=${localize(context.hass, "editor.drag_to_reorder")}
                draggable="true"
                @dragstart=${(event: DragEvent) =>
                  setDragData(event, OVERVIEW_DRAG_TYPE, definition.key)}
              >
                <ha-icon icon="mdi:drag"></ha-icon>
              </button>
            </div>
          `
        : ""}
    </div>
  `;
}

function orderedSectionsForEditor(selectedSections: SectionId[]): SectionId[] {
  const selected = new Set(selectedSections);
  return [
    ...selectedSections,
    ...DEFAULT_SECTIONS.filter((section) => !selected.has(section)),
  ];
}

function setDragData(event: DragEvent, type: string, value: string): void {
  event.dataTransfer?.setData(type, value);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function allowDrop(event: DragEvent, enabled: boolean): void {
  if (!enabled) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function dropSection(
  context: EditorOrderingContext,
  target: SectionId,
  enabled: boolean,
  event: DragEvent,
): void {
  if (!enabled) {
    return;
  }
  event.preventDefault();
  const source = event.dataTransfer?.getData(SECTION_DRAG_TYPE) as SectionId | undefined;
  if (source) {
    context.reorderSection(source, target);
  }
}

function dropOverviewEntity(
  context: EditorOrderingContext,
  target: EntityKey,
  enabled: boolean,
  event: DragEvent,
): void {
  if (!enabled) {
    return;
  }
  event.preventDefault();
  const source = event.dataTransfer?.getData(OVERVIEW_DRAG_TYPE);
  if (source) {
    context.reorderOverviewEntity(source, target);
  }
}

function checkedFromEvent(event: Event): boolean {
  return Boolean((event.target as { checked?: boolean }).checked);
}

function entityDefinitionsForOverview(activeKeys: Set<EntityKey> | undefined): EntityDefinition[] {
  const definitions = ENTITY_DEFINITIONS.filter((definition) => !definition.dynamic);
  if (!activeKeys) {
    return definitions;
  }
  return definitions.filter((definition) => activeKeys.has(definition.key));
}

function selectedEntityDefinitions(
  keys: EntityKey[],
  definitions: EntityDefinition[],
): EntityDefinition[] {
  return keys
    .map((key) => definitions.find((definition) => definition.key === key))
    .filter((definition): definition is EntityDefinition => Boolean(definition));
}
