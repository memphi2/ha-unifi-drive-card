import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { repeat } from "lit/directives/repeat.js";
import {
  DIAGNOSTIC_KEYS,
  ENTITY_DEFINITION_BY_KEY,
  FALLBACK_ENTITY_DEFINITION,
  STORAGE_KEYS,
  SYSTEM_KEYS,
  UPDATE_KEYS,
} from "./catalog";
import {
  callEntityService,
  installUpdate,
  selectOption,
  serviceForToggle,
  setNumberValue,
  setTimeValue,
} from "./actions";
import { actionEventConfig, isActionEnabled, type ActionTrigger } from "./card-actions";
import { normalizeConfig } from "./config";
import { DiscoveryCache } from "./discovery-cache";
import { discoverEntities } from "./discovery";
import { GROUP_KEYS, groupIcon } from "./entity-groups";
import {
  booleanState,
  displayState,
  entityState,
  friendlyName,
  isUnavailable,
  normalizeDisplayText,
  numericState,
} from "./format";
import { EntityActionController } from "./interaction-controller";
import { iconVisualClass, iconVisualState } from "./icon-visuals";
import { localize, sectionLabel } from "./i18n";
import { measure } from "./perf";
import { isVisibleRenderable } from "./rendering";
import { ServiceCallGuard, serviceActionKey } from "./service-call-guard";
import { headerStatusText } from "./status-text";
import { cardStyles } from "./styles";
import type {
  DiscoveredEntities,
  EntityDefinition,
  EntityGroup,
  HassEntity,
  HomeAssistant,
  NormalizedUnifiDriveCardConfig,
  Renderable,
  SectionId,
  UnifiDriveCardConfig,
} from "./types";

interface ResolvedEntity {
  definition: EntityDefinition;
  entityId?: string;
  state?: HassEntity;
}

interface RenderableSectionEntry {
  section: SectionId;
  content: Renderable;
}

type EntityResolver = (key: string) => ResolvedEntity;

@customElement("unifi-drive-card")
export class UnifiDriveCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config: NormalizedUnifiDriveCardConfig = normalizeConfig({});
  @state() private _errorMessage?: string;
  @state() private _busyActionKeys = new Set<string>();
  private readonly _actions = new EntityActionController();
  private readonly _discoveryCache = new DiscoveryCache();
  private readonly _serviceCalls = new ServiceCallGuard((keys) => {
    this._busyActionKeys = new Set(keys);
  });
  private _sectionRenderCache?: {
    signature: string;
    sections: RenderableSectionEntry[];
  };

  public setConfig(config: UnifiDriveCardConfig): void {
    this._config = normalizeConfig(config);
    this._sectionRenderCache = undefined;
  }

  public getCardSize(): number {
    return this._config.compact ? 5 : 9;
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("unifi-drive-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): UnifiDriveCardConfig {
    const discovered = discoverEntities(hass, normalizeConfig({}));
    return discovered.deviceId
      ? { type: "custom:unifi-drive-card", device_id: discovered.deviceId }
      : { type: "custom:unifi-drive-card" };
  }

  public override disconnectedCallback(): void {
    this._actions.clear();
    this._discoveryCache.clear();
    this._sectionRenderCache = undefined;
    this._serviceCalls.clear();
    super.disconnectedCallback();
  }

  protected override render() {
    if (!this.hass) {
      return html`<ha-card class="unifi-card">${localize(undefined, "state.loading")}</ha-card>`;
    }

    const discovered = measure("discovery", () => this._discoverEntities());
    const entityFor = this._entityResolver(discovered);
    const renderableSections = measure("section-render", () =>
      this._renderSections(entityFor, discovered),
    );
    const cardClass = this._cardClass(renderableSections.length);
    return html`
      <ha-card class=${cardClass}>
        ${this._renderHeader(discovered, entityFor)}
        ${this._errorMessage
          ? html`<div class="error-banner" role="alert">${this._errorMessage}</div>`
          : nothing}
        <div
          class="content-grid"
          style=${`--unifi-section-count: ${renderableSections.length};`}
        >
          ${repeat(
            renderableSections,
            (entry) => entry.section,
            (entry) => entry.content,
          )}
        </div>
      </ha-card>
    `;
  }

  private _cardClass(sectionCount: number): string {
    return [
      "unifi-card",
      this._config.compact ? "compact" : "",
      !this._config.compact && sectionCount >= 6 ? "layout-dense" : "layout-regular",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private _discoverEntities(): DiscoveredEntities {
    return this._discoveryCache.get(this.hass!, this._config);
  }

  private _renderSection(
    entityFor: EntityResolver,
    discovered: DiscoveredEntities,
    section: SectionId,
  ): Renderable {
    switch (section) {
      case "overview":
        return this._renderOverview(entityFor);
      case "storage":
        return this._renderKeySection("storage", entityFor, STORAGE_KEYS);
      case "pools":
        return this._renderGroupSection("pools", discovered.groups.pool);
      case "drives":
        return this._renderGroupSection("drives", discovered.groups.drive);
      case "snapshots":
        return this._renderGroupSection("snapshots", discovered.groups.snapshot);
      case "system":
        return this._renderKeySection("system", entityFor, SYSTEM_KEYS);
      case "updates":
        return this._renderKeySection("updates", entityFor, UPDATE_KEYS);
      case "diagnostics":
        return this._config.show_diagnostics
          ? this._renderKeySection("diagnostics", entityFor, DIAGNOSTIC_KEYS)
          : nothing;
      case "actions":
        return this._renderGroupSection("actions", discovered.groups.backup);
      default:
        return nothing;
    }
  }

  private _renderSections(
    entityFor: EntityResolver,
    discovered: DiscoveredEntities,
  ): RenderableSectionEntry[] {
    const signature = renderSectionsSignature(
      this._config,
      discovered,
      this.hass,
      this._busyActionKeys,
    );
    if (this._sectionRenderCache?.signature === signature) {
      return this._sectionRenderCache.sections;
    }
    const sections: RenderableSectionEntry[] = [];
    for (const section of this._config.sections) {
      const content = this._renderSection(entityFor, discovered, section);
      if (!isVisibleRenderable(content)) {
        continue;
      }
      sections.push({ section, content: content as Renderable });
    }
    this._sectionRenderCache = { signature, sections };
    return sections;
  }

  private _renderHeader(discovered: DiscoveredEntities, entityFor: EntityResolver) {
    const system = entityFor("system_status");
    const storage = entityFor("overall_status");
    const problem = entityFor("storage_problem");
    const usage = entityFor("usage_percent");
    const title =
      typeof this._config.name === "string" && this._config.name.trim()
        ? normalizeDisplayText(this._config.name, "UniFi Drive") || "UniFi Drive"
        : "UniFi Drive";
    return html`
      <header>
        ${this._renderActionButton(
          discovered.baseEntity,
          "title-block entity-action",
          title,
          html`
            <div class=${this._headerIconClass(problem.state)}>
              <ha-icon icon="mdi:nas"></ha-icon>
            </div>
            <div>
              <h2>${title}</h2>
              <p>
                ${headerStatusText(this.hass, {
                  system: system.state,
                  storage: storage.state,
                  problem: problem.state,
                  hasBaseEntity: Boolean(discovered.baseEntity),
                })}
              </p>
            </div>
          `,
        )}
        ${this._usageGauge(usage.state)}
      </header>
    `;
  }

  private _usageGauge(state?: HassEntity) {
    const usage = numericState(state);
    const label = state ? displayState(this.hass!, state) : localize(this.hass, "state.unknown");
    const clamped = usage === undefined ? 0 : Math.min(Math.max(usage, 0), 100);
    return html`
      <div class="usage-gauge" aria-label=${`Storage usage ${label}`}>
        <svg viewBox="0 0 44 44" role="img" aria-hidden="true">
          <circle class="track" cx="22" cy="22" r="18"></circle>
          <circle
            class="value"
            cx="22"
            cy="22"
            r="18"
            pathLength="100"
            stroke-dasharray=${`${clamped} 100`}
          ></circle>
        </svg>
        <strong>${label}</strong>
      </div>
    `;
  }

  private _renderOverview(entityFor: EntityResolver) {
    const tiles = this._config.overview_entities
      .map((key) => entityFor(key))
      .filter((item) => this._canRender(item.definition, item.state));
    if (!tiles.length) {
      return nothing;
    }
    return this._renderCardSection(
      "overview",
      html`
        <div
          class="metric-grid"
          style=${`--unifi-overview-columns: ${this._config.overview_columns};`}
        >
          ${repeat(
            tiles,
            (tile) => tile.definition.key,
            (tile) => this._metricTile(tile.definition, tile.entityId, tile.state),
          )}
        </div>
      `,
    );
  }

  private _renderKeySection(section: SectionId, entityFor: EntityResolver, keys: string[]) {
    const content = this._config.show_display_buttons
      ? this._displayButtonGrid(entityFor, keys, section)
      : this._entityRowList(entityFor, keys);
    return this._renderCardSection(section, content, sectionLabel(section, this.hass));
  }

  private _renderGroupSection(section: SectionId, groups: EntityGroup[]) {
    const renderedGroups = collectRenderable(groups, (group) => this._groupCard(group));
    if (!renderedGroups.length) {
      return nothing;
    }
    return this._renderCardSection(
      section,
      html`<div class="group-grid">${renderedGroups}</div>`,
      sectionLabel(section, this.hass),
    );
  }

  private _renderCardSection(
    section: SectionId,
    content: Renderable,
    title?: string,
  ): Renderable {
    if (!isVisibleRenderable(content)) {
      return nothing;
    }
    return html`
      <section class="card-section" data-section=${section}>
        ${title ? html`<h3>${title}</h3>` : nothing}
        ${content}
      </section>
    `;
  }

  private _entityRowList(entityFor: EntityResolver, keys: string[]): Renderable {
    const rows = collectRenderable(keys, (key) => this._entityRow(entityFor, key));
    return rows.length ? html`<div class="rows entity-list">${rows}</div>` : nothing;
  }

  private _displayButtonGrid(
    entityFor: EntityResolver,
    keys: string[],
    variant: string,
  ): Renderable {
    const buttons = collectRenderable(keys, (key) => this._displayButton(entityFor, key));
    if (!buttons.length) {
      return nothing;
    }
    return html`<div class="display-button-grid ${variant}">${buttons}</div>`;
  }

  private _displayButton(entityFor: EntityResolver, key: string): Renderable {
    const item = entityFor(key);
    if (!this._canRender(item.definition, item.state)) {
      return nothing;
    }
    const label = friendlyName(item.definition, item.state, this.hass);
    const value = displayState(this.hass!, item.state);
    const control = this._rowControl(item.definition, item.entityId, item.state);
    const active = item.state ? booleanState(item.state) : false;
    const busy = this._isEntityBusy(item.entityId);
    return html`
      <div
        class="display-button-tile ${active ? "active" : ""} ${busy ? "busy" : ""}"
        data-entity-key=${item.definition.key}
        aria-busy=${String(busy)}
      >
        ${this._renderActionButton(
          item.entityId,
          "display-button-main entity-action",
          `${label}: ${value}`,
          html`
            <div class=${this._iconBubbleClass(item.definition, item.state)}>
              <ha-icon icon=${item.definition.icon}></ha-icon>
            </div>
            <span>${label}</span>
            <strong>${value}</strong>
          `,
        )}
        ${isVisibleRenderable(control)
          ? html`<div class="display-button-control">${control}</div>`
          : nothing}
      </div>
    `;
  }

  private _groupCard(group: EntityGroup) {
    const rows = collectRenderable(GROUP_KEYS[group.kind], (key) =>
      this._groupEntityRow(group, key),
    );
    if (!rows.length) {
      return nothing;
    }
    return html`
      <article class="group-card ${group.kind}">
        <div class="group-header">
          <div class="group-title">
            <ha-icon icon=${groupIcon(group.kind)}></ha-icon>
            <strong>${group.name}</strong>
          </div>
          ${group.type ? html`<span>${normalizeDisplayText(group.type) || group.type}</span>` : nothing}
        </div>
        <div class="rows group-rows">${rows}</div>
      </article>
    `;
  }

  private _metricTile(definition: EntityDefinition, entityId?: string, state?: HassEntity) {
    const label = friendlyName(definition, state, this.hass);
    const value = displayState(this.hass!, state);
    return this._renderActionButton(
      entityId,
      "metric entity-action",
      `${label}: ${value}`,
      html`
        <div class=${this._iconBubbleClass(definition, state)}>
          <ha-icon icon=${definition.icon}></ha-icon>
        </div>
        <span>${label}</span>
        <strong>${value}</strong>
      `,
    );
  }

  private _entityRow(entityFor: EntityResolver, key: string): Renderable {
    const item = entityFor(key);
    return this._entityRowContent(item.definition, item.entityId, item.state);
  }

  private _groupEntityRow(group: EntityGroup, key: string): Renderable {
    const definition = ENTITY_DEFINITION_BY_KEY[key] ?? FALLBACK_ENTITY_DEFINITION;
    const entityId = group.entityIds[key];
    return this._entityRowContent(definition, entityId, entityState(this.hass!, entityId));
  }

  private _entityRowContent(
    definition: EntityDefinition,
    entityId: string | undefined,
    state: HassEntity | undefined,
  ): Renderable {
    if (!this._canRender(definition, state)) {
      return nothing;
    }
    const label = friendlyName(definition, state, this.hass);
    const value = displayState(this.hass!, state);
    const control = this._rowControl(definition, entityId, state);
    const busy = this._isEntityBusy(entityId);
    return html`
      <div class="entity-row ${busy ? "busy" : ""}" aria-busy=${String(busy)} data-entity-key=${definition.key}>
        ${this._renderActionButton(
          entityId,
          "entity-main entity-action",
          `${label}: ${value}`,
          html`
            <div class=${this._iconBubbleClass(definition, state)}>
              <ha-icon icon=${definition.icon}></ha-icon>
            </div>
            <div class="main">
              <strong>${label}</strong>
              <span>${value}</span>
            </div>
          `,
        )}
        ${isVisibleRenderable(control) ? html`<div class="row-control">${control}</div>` : nothing}
      </div>
    `;
  }

  private _renderActionButton(
    entityId: string | undefined,
    buttonClass: string,
    ariaLabel: string,
    content: Renderable,
  ): Renderable {
    return html`
      <button
        class=${buttonClass}
        type="button"
        ?disabled=${!entityId}
        aria-label=${ariaLabel}
        @click=${(event: MouseEvent) => this._handleTapAction(event, entityId)}
        @dblclick=${(event: MouseEvent) => this._handleDoubleTapAction(event, entityId)}
        @pointerdown=${(event: PointerEvent) => this._startHoldAction(event, entityId)}
        @pointerup=${this._finishHoldAction}
        @pointerleave=${this._cancelHoldAction}
        @pointercancel=${this._cancelHoldAction}
      >
        ${content}
      </button>
    `;
  }

  private _rowControl(
    definition: EntityDefinition,
    entityId: string | undefined,
    state: HassEntity | undefined,
  ) {
    if (!entityId || !state || isUnavailable(state)) {
      return nothing;
    }
    switch (definition.domain) {
      case "switch": {
        const service = serviceForToggle(state);
        const busy = this._isServiceBusy(entityId, service);
        return html`
          <button class="chip ${booleanState(state) ? "active" : ""}" ?disabled=${busy} aria-busy=${String(busy)} @click=${() => this._toggleSwitch(entityId, state)}>
            ${booleanState(state) ? localize(this.hass, "button.on") : localize(this.hass, "button.off")}
          </button>
        `;
      }
      case "button": {
        const busy = this._isServiceBusy(entityId, "press");
        return html`
          <button class="chip" ?disabled=${busy} aria-busy=${String(busy)} @click=${() => this._pressButton(definition, entityId)}>
            ${localize(this.hass, "button.press")}
          </button>
        `;
      }
      case "number": {
        const busy = this._isServiceBusy(entityId, "set_value");
        const min = inputAttributeValue(state.attributes.min);
        const max = inputAttributeValue(state.attributes.max);
        const step = inputAttributeValue(state.attributes.step) ?? "1";
        return html`
          <input
            class="number"
            type="number"
            min=${ifDefined(min)}
            max=${ifDefined(max)}
            step=${step}
            .value=${String(numericState(state) ?? "")}
            ?disabled=${busy}
            aria-busy=${String(busy)}
            @change=${(event: Event) => this._setNumber(entityId, state, event)}
          />
        `;
      }
      case "select":
        return this._selectControl(entityId, state);
      case "time": {
        const busy = this._isServiceBusy(entityId, "set_value");
        return html`
          <input
            class="time"
            type="time"
            step="1"
            .value=${state.state}
            ?disabled=${busy}
            aria-busy=${String(busy)}
            @change=${(event: Event) => this._setTime(entityId, event)}
          />
        `;
      }
      case "update": {
        const busy = this._isServiceBusy(entityId, "install");
        const updateAvailable = state.state === "on";
        return html`
          <button
            class="chip ${updateAvailable ? "active" : ""}"
            title=${localize(this.hass, "tooltip.install_update")}
            ?disabled=${busy || !updateAvailable}
            aria-busy=${String(busy)}
            @click=${() => this._installUpdate(entityId)}
          >
            ${localize(this.hass, "button.install")}
          </button>
        `;
      }
      default:
        return nothing;
    }
  }

  private _selectControl(entityId: string, state: HassEntity) {
    const busy = this._isServiceBusy(entityId, "select_option");
    const options = Array.isArray(state.attributes.options)
      ? state.attributes.options.map(String)
      : [];
    if (!options.length) {
      return nothing;
    }
    return html`
      <select ?disabled=${busy} aria-busy=${String(busy)} @change=${(event: Event) => this._selectOption(entityId, event)}>
        ${options.map(
          (option) =>
            html`<option value=${option} ?selected=${option === state.state}>
              ${normalizeDisplayText(option) || option}
            </option>`,
        )}
      </select>
    `;
  }

  private _entity(discovered: DiscoveredEntities, key: string): ResolvedEntity {
    const definition = ENTITY_DEFINITION_BY_KEY[key] ?? FALLBACK_ENTITY_DEFINITION;
    const entityId = discovered.entityIds[key];
    const state = entityState(this.hass!, entityId);
    return { definition, entityId, state };
  }

  private _entityResolver(discovered: DiscoveredEntities): EntityResolver {
    const cache = new Map<string, ResolvedEntity>();
    return (key: string): ResolvedEntity => {
      const cached = cache.get(key);
      if (cached) {
        return cached;
      }
      const resolved = this._entity(discovered, key);
      cache.set(key, resolved);
      return resolved;
    };
  }

  private _canRender(definition: EntityDefinition, state?: HassEntity): boolean {
    if (definition.dangerous && !this._config.show_dangerous_actions) {
      return false;
    }
    if (definition.diagnostic && !this._config.show_diagnostics) {
      return false;
    }
    if (!state) {
      return this._config.show_optional && Boolean(definition.optional);
    }
    return this._config.show_unavailable || !isUnavailable(state);
  }

  private _iconBubbleClass(definition: EntityDefinition, state?: HassEntity): string {
    return iconVisualClass(definition, state, this._config.show_icon_animations);
  }

  private _headerIconClass(problem?: HassEntity): string {
    const problemDefinition = ENTITY_DEFINITION_BY_KEY.storage_problem ?? FALLBACK_ENTITY_DEFINITION;
    const visual = iconVisualState(
      problemDefinition,
      problem,
      this._config.show_icon_animations,
    );
    return [
      "icon-bubble",
      "primary",
      visual.tone,
      visual.active ? "active" : "",
      visual.animated ? `motion-${visual.motion}` : "",
      visual.animated ? "animated" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private _handleTapAction(event: MouseEvent, entityId: string | undefined): void {
    this._actions.handleClick(event, this._interactionOptions(entityId));
  }

  private _handleDoubleTapAction(event: MouseEvent, entityId: string | undefined): void {
    this._actions.handleDoubleClick(event, this._interactionOptions(entityId));
  }

  private _startHoldAction(event: PointerEvent, entityId: string | undefined): void {
    this._actions.handlePointerDown(event, this._interactionOptions(entityId));
  }

  private _finishHoldAction = (): void => {
    this._actions.handlePointerEnd();
  };

  private _cancelHoldAction = (): void => {
    this._actions.handlePointerEnd(false);
  };

  private _interactionOptions(entityId: string | undefined) {
    return {
      entityId,
      hasDoubleTap: isActionEnabled(this._config.double_tap_action),
      hasHold: isActionEnabled(this._config.hold_action),
      dispatch: (targetEntityId: string, trigger: ActionTrigger) =>
        this._fireAction(targetEntityId, trigger),
    };
  }

  private _fireAction(entityId: string | undefined, trigger: ActionTrigger): void {
    if (!entityId) {
      return;
    }
    const config = actionEventConfig(this._config, trigger, entityId);
    if (!config) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("hass-action", {
        bubbles: true,
        composed: true,
        detail: { action: trigger, config },
      }),
    );
  }

  private _isActionBusy(key: string): boolean {
    return this._busyActionKeys.has(key);
  }

  private _isServiceBusy(entityId: string, service: string): boolean {
    return this._isActionBusy(serviceActionKey(entityId, service));
  }

  private _isEntityBusy(entityId: string | undefined): boolean {
    return entityId ? this._serviceCalls.isEntityBusy(entityId) : false;
  }

  private async _toggleSwitch(entityId: string, state: HassEntity): Promise<void> {
    const service = serviceForToggle(state);
    await this._runServiceCall(serviceActionKey(entityId, service), () =>
      callEntityService(this.hass!, entityId, service),
    );
  }

  private async _pressButton(definition: EntityDefinition, entityId: string): Promise<void> {
    if (
      definition.dangerous &&
      !window.confirm(
        localize(this.hass, "confirm.run", {
          label: friendlyName(definition, undefined, this.hass),
        }),
      )
    ) {
      return;
    }
    await this._runServiceCall(serviceActionKey(entityId, "press"), () =>
      callEntityService(this.hass!, entityId, "press"),
    );
  }

  private async _setNumber(
    entityId: string,
    state: HassEntity | undefined,
    event: Event,
  ): Promise<void> {
    await this._runServiceCall(serviceActionKey(entityId, "set_value"), () =>
      setNumberValue(this.hass!, entityId, state, (event.target as HTMLInputElement).value),
    );
  }

  private async _selectOption(entityId: string, event: Event): Promise<void> {
    await this._runServiceCall(serviceActionKey(entityId, "select_option"), () =>
      selectOption(this.hass!, entityId, (event.target as HTMLSelectElement).value),
    );
  }

  private async _setTime(entityId: string, event: Event): Promise<void> {
    await this._runServiceCall(serviceActionKey(entityId, "set_value"), () =>
      setTimeValue(this.hass!, entityId, (event.target as HTMLInputElement).value),
    );
  }

  private async _installUpdate(entityId: string): Promise<void> {
    await this._runServiceCall(serviceActionKey(entityId, "install"), () =>
      installUpdate(this.hass!, entityId),
    );
  }

  private async _runServiceCall(
    key: string,
    action: () => Promise<unknown>,
  ): Promise<void> {
    await this._serviceCalls.run(key, async () => {
      try {
        this._errorMessage = undefined;
        await action();
      } catch (error) {
        const message = localize(this.hass, "error.action_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        this._errorMessage = message;
        this.dispatchEvent(
          new CustomEvent("hass-notification", {
            bubbles: true,
            composed: true,
            detail: { message },
          }),
        );
      }
    });
  }

  static override styles = cardStyles;
}

function inputAttributeValue(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

function collectRenderable<T>(
  items: readonly T[],
  render: (item: T) => Renderable,
): Renderable[] {
  const rendered: Renderable[] = [];
  for (const item of items) {
    const next = render(item);
    if (isVisibleRenderable(next)) {
      rendered.push(next);
    }
  }
  return rendered;
}

function renderSectionsSignature(
  config: NormalizedUnifiDriveCardConfig,
  discovered: DiscoveredEntities,
  hass: HomeAssistant | undefined,
  busyActionKeys: ReadonlySet<string>,
): string {
  return JSON.stringify({
    sections: config.sections,
    overview: config.overview_entities,
    optional: config.show_optional,
    unavailable: config.show_unavailable,
    diagnostics: config.show_diagnostics,
    dangerous: config.show_dangerous_actions,
    displayButtons: config.show_display_buttons,
    discovered: objectIdentityToken(discovered),
    states: objectIdentityToken(hass?.states),
    busy: [...busyActionKeys].sort(),
    locale: localeSignature(hass),
    formatState: objectIdentityToken(hass?.formatEntityState),
    formatName: objectIdentityToken(hass?.formatEntityName),
  });
}

function localeSignature(hass: HomeAssistant | undefined): string {
  if (!hass?.locale || typeof hass.locale !== "object") {
    return "";
  }
  try {
    return JSON.stringify(hass.locale);
  } catch {
    return "";
  }
}

const OBJECT_TOKENS = new WeakMap<object, number>();
let nextObjectToken = 1;

function objectIdentityToken(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }
  const objectValue = value as object;
  const existing = OBJECT_TOKENS.get(objectValue);
  if (existing !== undefined) {
    return existing;
  }
  const token = nextObjectToken++;
  OBJECT_TOKENS.set(objectValue, token);
  return token;
}
