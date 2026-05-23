import { html } from "lit";
import { DEFAULT_SECTIONS, ENTITY_DEFINITIONS } from "./catalog";
import { entityLabel, localize, sectionLabel } from "./i18n";
import { switchFormField } from "./editor-form";
import { checkedFromEvent } from "./editor-shared";
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

export function activeOverviewEntities(keys: EntityKey[], activeKeys: Set<EntityKey>): EntityKey[] {
  return keys.filter((key) => activeKeys.has(key));
}

export function moveActiveOverviewEntity(
  keys: EntityKey[],
  key: EntityKey,
  direction: -1 | 1,
  activeKeys: Set<EntityKey> | undefined,
): EntityKey[] {
  if (!activeKeys) {
    return moveItem(keys, key, direction);
  }
  const activeSelection = activeOverviewEntities(keys, activeKeys);
  const movedActiveSelection = moveItem(activeSelection, key, direction);
  return replaceActiveOverviewEntities(keys, activeKeys, movedActiveSelection);
}

export function reorderItem<T>(items: T[], source: T, target: T): T[] {
  if (source === target) {
    return [...items];
  }
  const next = [...items];
  const sourceIndex = next.indexOf(source);
  const targetIndex = next.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0) {
    return next;
  }
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
  const selectedIndex = context.sections.indexOf(section);
  const moveUpLabel = localize(context.hass, "editor.move_up");
  const moveDownLabel = localize(context.hass, "editor.move_down");
  const dragLabel = localize(context.hass, "editor.drag_to_reorder");
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
          { isLocalizedText: true },
        )}
      </div>
      ${orderActionButtons({
        moveUpLabel,
        moveDownLabel,
        dragLabel,
        moveUpDisabled: !checked || selectedIndex <= 0,
        moveDownDisabled: !checked || selectedIndex < 0 || selectedIndex >= context.sections.length - 1,
        dragDisabled: !checked,
        draggable: checked,
        onMoveUp: () => context.moveSection(section, -1),
        onMoveDown: () => context.moveSection(section, 1),
        onDragStart: (event: DragEvent) => setDragData(event, SECTION_DRAG_TYPE, section),
      })}
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
  const moveUpLabel = localize(context.hass, "editor.move_up");
  const moveDownLabel = localize(context.hass, "editor.move_down");
  const dragLabel = localize(context.hass, "editor.drag_to_reorder");
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
          { isLocalizedText: true },
        )}
      </div>
      ${checked
        ? html`
            ${orderActionButtons({
              moveUpLabel,
              moveDownLabel,
              dragLabel,
              moveUpDisabled: selectedIndex <= 0,
              moveDownDisabled:
                selectedIndex >= context.overviewEntities.length - 1,
              dragDisabled: false,
              draggable: true,
              onMoveUp: () => context.moveOverviewEntity(definition.key, -1),
              onMoveDown: () => context.moveOverviewEntity(definition.key, 1),
              onDragStart: (event: DragEvent) =>
                setDragData(event, OVERVIEW_DRAG_TYPE, definition.key),
            })}
          `
        : ""}
    </div>
  `;
}

function orderActionButtons({
  moveUpLabel,
  moveDownLabel,
  dragLabel,
  moveUpDisabled,
  moveDownDisabled,
  dragDisabled,
  draggable,
  onMoveUp,
  onMoveDown,
  onDragStart,
}: {
  moveUpLabel: string;
  moveDownLabel: string;
  dragLabel: string;
  moveUpDisabled: boolean;
  moveDownDisabled: boolean;
  dragDisabled: boolean;
  draggable: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (event: DragEvent) => void;
}) {
  return html`
    <div class="order-actions">
      <button
        class="icon-button"
        type="button"
        title=${moveUpLabel}
        aria-label=${moveUpLabel}
        ?disabled=${moveUpDisabled}
        @click=${onMoveUp}
      >
        <ha-icon icon="mdi:chevron-up"></ha-icon>
      </button>
      <button
        class="icon-button"
        type="button"
        title=${moveDownLabel}
        aria-label=${moveDownLabel}
        ?disabled=${moveDownDisabled}
        @click=${onMoveDown}
      >
        <ha-icon icon="mdi:chevron-down"></ha-icon>
      </button>
      <button
        class="drag-handle"
        type="button"
        title=${dragLabel}
        aria-label=${dragLabel}
        draggable=${draggable ? "true" : "false"}
        ?disabled=${dragDisabled}
        @dragstart=${onDragStart}
      >
        <ha-icon icon="mdi:drag"></ha-icon>
      </button>
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

function replaceActiveOverviewEntities(
  keys: EntityKey[],
  activeKeys: Set<EntityKey>,
  nextActiveSelection: EntityKey[],
): EntityKey[] {
  const nextActive = [...nextActiveSelection];
  return keys.map((entry) =>
    activeKeys.has(entry) ? (nextActive.shift() ?? entry) : entry,
  );
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
