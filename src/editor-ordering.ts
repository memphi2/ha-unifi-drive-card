import { html } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { DEFAULT_SECTIONS, ENTITY_DEFINITIONS } from "./catalog";
import { checkedFromEvent } from "./editor-shared";
import { editorFoldout, switchFormField } from "./editor-form";
import { entityLabel, localize, sectionLabel } from "./i18n";
import type { EntityDefinition, EntityKey, HomeAssistant, SectionId } from "./types";

export interface EditorOrderingContext {
  hass?: HomeAssistant;
  sections: SectionId[];
  overviewEntities: EntityKey[];
  activeEntityKeys?: Set<EntityKey>;
  toggleSection: (section: SectionId, checked: boolean) => void;
  reorderSection: (source: SectionId, target: SectionId) => void;
  toggleOverviewEntity: (key: EntityKey, checked: boolean) => void;
  reorderOverviewEntity: (source: EntityKey, target: EntityKey) => void;
}

const SECTION_DRAG_TYPE = "application/x-unifi-drive-section";
const OVERVIEW_DRAG_TYPE = "application/x-unifi-drive-overview-entity";

export function renderSectionOrderEditor(context: EditorOrderingContext) {
  const sections = orderedSectionsForEditor(context.sections);
  return html`
    <section class="sections-editor">
      ${editorFoldout(context.hass, {
        className: "sections-foldout",
        titleKey: "editor.sections",
        helpKey: "editor.sections_help",
        count: context.sections.length,
        content: html`
          <div class="order-list section-order-list">
            ${repeat(
              sections,
              (section) => section,
              (section) => sectionToggle(context, section),
            )}
          </div>
        `,
      })}
    </section>
  `;
}

export function renderOverviewEntityEditor(context: EditorOrderingContext) {
  const activeDefinitions = entityDefinitionsForOverview(context.activeEntityKeys);
  const selectedDefinitions = selectedEntityDefinitions(
    context.overviewEntities,
    activeDefinitions,
  );
  const selectedOrder = selectedDefinitions.map((definition) => definition.key);
  const selected = new Set(selectedDefinitions.map((definition) => definition.key));
  const availableDefinitions = activeDefinitions.filter(
    (definition) => !selected.has(definition.key),
  );
  return html`
    <section class="overview-editor">
      ${editorFoldout(context.hass, {
        className: "overview-foldout",
        titleKey: "editor.overview_entities",
        helpKey: "editor.overview_entities_help",
        count: selectedDefinitions.length,
        content: html`
          <div class="overview-entity-groups">
            ${selectedDefinitions.length
              ? editorFoldout(context.hass, {
                  className: "overview-entity-section",
                  titleKey: "editor.selected_overview_entities",
                  count: selectedDefinitions.length,
                  content: html`
                    <div class="order-list overview-order-list">
                      ${repeat(
                        selectedDefinitions,
                        (definition) => definition.key,
                        (definition) =>
                          overviewEntityToggle(context, definition, selected, selectedOrder),
                      )}
                    </div>
                  `,
                })
              : ""}
            ${availableDefinitions.length
              ? editorFoldout(context.hass, {
                  className: "overview-entity-section",
                  titleKey: "editor.available_overview_entities",
                  count: availableDefinitions.length,
                  content: html`
                    <div class="overview-entity-grid">
                      ${repeat(
                        availableDefinitions,
                        (definition) => definition.key,
                        (definition) =>
                          overviewEntityToggle(context, definition, selected, selectedOrder),
                      )}
                    </div>
                  `,
                })
              : ""}
          </div>
        `,
      })}
    </section>
  `;
}

export function toggleListItem<T>(items: T[], item: T, enabled: boolean): T[] {
  if (enabled) {
    return items.includes(item) ? items : [...items, item];
  }
  return items.includes(item) ? items.filter((entry) => entry !== item) : items;
}

export function activeOverviewEntities(keys: EntityKey[], activeKeys: Set<EntityKey>): EntityKey[] {
  if (keys.every((key) => activeKeys.has(key))) {
    return keys;
  }
  return keys.filter((key) => activeKeys.has(key));
}

export function reorderItem<T>(items: T[], source: T, target: T): T[] {
  if (source === target) {
    return items;
  }
  const sourceIndex = items.indexOf(source);
  const targetIndex = items.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0) {
    return items;
  }
  const next = [...items];
  const [entry] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, entry as T);
  return next;
}

export function reorderActiveOverviewEntity(
  keys: EntityKey[],
  source: EntityKey,
  target: EntityKey,
  activeKeys: Set<EntityKey> | undefined,
): EntityKey[] {
  if (!activeKeys) {
    return reorderItem(keys, source, target);
  }
  const activeSelection = activeOverviewEntities(keys, activeKeys);
  const movedActiveSelection = reorderItem(activeSelection, source, target);
  return replaceActiveOverviewEntities(keys, activeKeys, movedActiveSelection);
}

function sectionToggle(context: EditorOrderingContext, section: SectionId) {
  const checked = context.sections.includes(section);
  return html`
    <div
      class="order-row section-order-row"
      data-section-key=${section}
      @dragover=${(event: DragEvent) => allowDrop(event, checked)}
      @drop=${(event: DragEvent) => dropSection(context, section, checked, event)}
    >
      <div class="check switch-row">
        ${switchFormField(
          context.hass,
          sectionLabel(section, context.hass),
          checked,
          (event: Event) => context.toggleSection(section, checkedFromEvent(event)),
          {
            helpKey: "editor.section_visibility_help",
            isLocalizedText: true,
          },
        )}
      </div>
      <div class="order-actions">
        <button
          class="drag-handle"
          type="button"
          title=${localize(context.hass, "editor.drag_to_reorder")}
          aria-label=${localize(context.hass, "editor.drag_to_reorder")}
          aria-keyshortcuts="ArrowUp ArrowDown"
          draggable=${checked ? "true" : "false"}
          ?disabled=${!checked}
          @dragstart=${(event: DragEvent) => setDragData(event, SECTION_DRAG_TYPE, section)}
          @keydown=${(event: KeyboardEvent) =>
            reorderByKeyboard(
              event,
              section,
              context.sections,
              (target) => context.reorderSection(section, target),
              checked,
            )}
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
  selectedOrder: EntityKey[],
) {
  const checked = selected.has(definition.key);
  return html`
    <div
      class="overview-entity-toggle"
      data-overview-key=${definition.key}
      @dragover=${(event: DragEvent) => allowDrop(event, checked)}
      @drop=${(event: DragEvent) =>
        dropOverviewEntity(context, definition.key, checked, event)}
    >
      <div class="check switch-row">
        ${switchFormField(
          context.hass,
          entityLabel(definition, context.hass),
          checked,
          (event: Event) =>
            context.toggleOverviewEntity(definition.key, checkedFromEvent(event)),
          {
            helpKey: "editor.overview_entity_visibility_help",
            isLocalizedText: true,
          },
        )}
      </div>
      ${checked
        ? html`
            <div class="order-actions">
              <button
                class="drag-handle"
                type="button"
                title=${localize(context.hass, "editor.drag_to_reorder")}
                aria-label=${localize(context.hass, "editor.drag_to_reorder")}
                aria-keyshortcuts="ArrowUp ArrowDown"
                draggable="true"
                @dragstart=${(event: DragEvent) =>
                  setDragData(event, OVERVIEW_DRAG_TYPE, definition.key)}
                @keydown=${(event: KeyboardEvent) =>
                  reorderByKeyboard(
                    event,
                    definition.key,
                    selectedOrder,
                    (target) => context.reorderOverviewEntity(definition.key, target),
                    true,
                  )}
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
  return [...selectedSections, ...DEFAULT_SECTIONS.filter((section) => !selected.has(section))];
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

function dropOverviewEntity(
  context: EditorOrderingContext,
  target: EntityKey,
  enabled: boolean,
  event: DragEvent,
): void {
  handleDrop(
    enabled,
    event,
    OVERVIEW_DRAG_TYPE,
    (source: EntityKey) => context.reorderOverviewEntity(source, target),
  );
}

function dropSection(
  context: EditorOrderingContext,
  target: SectionId,
  enabled: boolean,
  event: DragEvent,
): void {
  handleDrop(
    enabled,
    event,
    SECTION_DRAG_TYPE,
    (source: SectionId) => context.reorderSection(source, target),
  );
}

function handleDrop<T extends string>(
  enabled: boolean,
  event: DragEvent,
  dragType: string,
  moveItem: (source: T) => void,
): void {
  if (!enabled) {
    return;
  }
  event.preventDefault();
  const source = event.dataTransfer?.getData(dragType) as T | undefined;
  if (source) {
    moveItem(source);
  }
}

function reorderByKeyboard<T extends string>(
  event: KeyboardEvent,
  current: T,
  ordered: readonly T[],
  moveItem: (target: T) => void,
  enabled: boolean,
): void {
  if (!enabled || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const index = ordered.indexOf(current);
  if (index < 0) {
    return;
  }
  const delta = event.key === "ArrowUp" ? -1 : 1;
  const target = ordered[index + delta];
  if (target) {
    moveItem(target);
  }
}

function entityDefinitionsForOverview(activeKeys: Set<EntityKey> | undefined): EntityDefinition[] {
  if (!activeKeys) {
    return ENTITY_DEFINITIONS;
  }
  return ENTITY_DEFINITIONS.filter((definition) => activeKeys.has(definition.key));
}

function selectedEntityDefinitions(
  keys: EntityKey[],
  definitions: EntityDefinition[],
): EntityDefinition[] {
  if (!keys.length || !definitions.length) {
    return [];
  }
  const byKey = new Map<EntityKey, EntityDefinition>(
    definitions.map((definition) => [definition.key, definition]),
  );
  return keys
    .map((key) => byKey.get(key))
    .filter((definition): definition is EntityDefinition => Boolean(definition));
}

function replaceActiveOverviewEntities(
  keys: EntityKey[],
  activeKeys: Set<EntityKey>,
  nextActiveSelection: EntityKey[],
): EntityKey[] {
  const replacement = [...nextActiveSelection];
  return keys.map((entry) => (activeKeys.has(entry) ? (replacement.shift() ?? entry) : entry));
}
