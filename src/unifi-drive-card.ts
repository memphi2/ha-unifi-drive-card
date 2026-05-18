import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
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
import { iconVisualClass } from "./icon-visuals";
import { localize, sectionLabel } from "./i18n";
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

@customElement("unifi-drive-card")
export class UnifiDriveCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config: NormalizedUnifiDriveCardConfig = normalizeConfig({});
  @state() private _errorMessage?: string;
  @state() private _busyActionKeys = new Set<string>();
  private readonly _actions = new EntityActionController();
  private readonly _serviceCalls = new ServiceCallGuard((keys) => {
    this._busyActionKeys = new Set(keys);
  });

  public setConfig(config: UnifiDriveCardConfig): void {
    this._config = normalizeConfig(config);
  }

  public getCardSize(): number {
    return this._config.compact ? 5 : 9;
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement("unifi-drive-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): UnifiDriveCardConfig {
    const discovered = discoverEntities(hass, normalizeConfig({}));
    return { type: "custom:unifi-drive-card", entity: discovered.baseEntity };
  }

  public override disconnectedCallback(): void {
    this._actions.clear();
    this._serviceCalls.clear();
    super.disconnectedCallback();
  }

  protected override render() {
    if (!this.hass) {
      return html`<ha-card class="unifi-card">${localize(undefined, "state.loading")}</ha-card>`;
    }

    const discovered = discoverEntities(this.hass, this._config);
    return html`
      <ha-card class="unifi-card ${this._config.compact ? "compact" : ""}">
        ${this._renderHeader(discovered)}
        ${this._errorMessage
          ? html`<div class="error-banner" role="alert">${this._errorMessage}</div>`
          : nothing}
        <div class="content-grid">
          ${this._config.sections.map((section) => this._renderSection(discovered, section))}
        </div>
      </ha-card>
    `;
  }

  private _renderSection(discovered: DiscoveredEntities, section: SectionId): Renderable {
    switch (section) {
      case "overview":
        return this._renderOverview(discovered);
      case "storage":
        return this._renderKeySection("storage", discovered, STORAGE_KEYS);
      case "pools":
        return this._renderGroupSection("pools", discovered.groups.pool);
      case "drives":
        return this._renderGroupSection("drives", discovered.groups.drive);
      case "snapshots":
        return this._renderGroupSection("snapshots", discovered.groups.snapshot);
      case "system":
        return this._renderKeySection("system", discovered, SYSTEM_KEYS);
      case "updates":
        return this._renderKeySection("updates", discovered, UPDATE_KEYS);
      case "diagnostics":
        return this._config.show_diagnostics
          ? this._renderKeySection("diagnostics", discovered, DIAGNOSTIC_KEYS)
          : nothing;
      case "actions":
        return this._renderGroupSection("actions", discovered.groups.backup);
      default:
        return nothing;
    }
  }

  private _renderHeader(discovered: DiscoveredEntities) {
    const system = this._entity(discovered, "system_status");
    const storage = this._entity(discovered, "overall_status");
    const problem = this._entity(discovered, "storage_problem");
    const usage = this._entity(discovered, "usage_percent");
    const title =
      typeof this._config.name === "string" && this._config.name.trim()
        ? normalizeDisplayText(this._config.name, "UniFi Drive") || "UniFi Drive"
        : "UniFi Drive";
    return html`
      <header>
        <button
          class="title-block entity-action"
          type="button"
          ?disabled=${!discovered.baseEntity}
          @click=${(event: MouseEvent) => this._handleTapAction(event, discovered.baseEntity)}
          @dblclick=${(event: MouseEvent) => this._handleDoubleTapAction(event, discovered.baseEntity)}
          @pointerdown=${(event: PointerEvent) => this._startHoldAction(event, discovered.baseEntity)}
          @pointerup=${this._finishHoldAction}
          @pointerleave=${this._cancelHoldAction}
          @pointercancel=${this._cancelHoldAction}
        >
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
        </button>
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

  private _renderOverview(discovered: DiscoveredEntities) {
    const tiles = this._config.overview_entities
      .map((key) => this._entity(discovered, key))
      .filter((item) => this._canRender(item.definition, item.state));
    if (!tiles.length) {
      return nothing;
    }
    return this._renderCardSection(
      "overview",
      html`
        <div class="metric-grid">
          ${tiles.map(({ definition, entityId, state }) =>
            this._metricTile(definition, entityId, state),
          )}
        </div>
      `,
    );
  }

  private _renderKeySection(section: SectionId, discovered: DiscoveredEntities, keys: string[]) {
    const content = this._config.show_display_buttons
      ? this._displayButtonGrid(discovered, keys, section)
      : this._entityRowList(discovered, keys);
    return this._renderCardSection(section, content, sectionLabel(section, this.hass));
  }

  private _renderGroupSection(section: SectionId, groups: EntityGroup[]) {
    const renderedGroups = groups.map((group) => this._groupCard(group)).filter(isVisibleRenderable);
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

  private _entityRowList(discovered: DiscoveredEntities, keys: string[]): Renderable {
    const rows = keys
      .map((key) => this._entityRow(discovered, key))
      .filter(isVisibleRenderable)
      .slice(0, this._config.max_sensor_rows);
    return rows.length ? html`<div class="rows entity-list">${rows}</div>` : nothing;
  }

  private _displayButtonGrid(
    discovered: DiscoveredEntities,
    keys: string[],
    variant: string,
  ): Renderable {
    const buttons = keys
      .map((key) => this._displayButton(discovered, key))
      .filter(isVisibleRenderable)
      .slice(0, this._config.max_sensor_rows);
    if (!buttons.length) {
      return nothing;
    }
    return html`<div class="display-button-grid ${variant}">${buttons}</div>`;
  }

  private _displayButton(discovered: DiscoveredEntities, key: string): Renderable {
    const item = this._entity(discovered, key);
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
        <button
          class="display-button-main entity-action"
          type="button"
          ?disabled=${!item.entityId}
          aria-label=${`${label}: ${value}`}
          @click=${(event: MouseEvent) => this._handleTapAction(event, item.entityId)}
          @dblclick=${(event: MouseEvent) => this._handleDoubleTapAction(event, item.entityId)}
          @pointerdown=${(event: PointerEvent) => this._startHoldAction(event, item.entityId)}
          @pointerup=${this._finishHoldAction}
          @pointerleave=${this._cancelHoldAction}
          @pointercancel=${this._cancelHoldAction}
        >
          <div class=${this._iconBubbleClass(item.definition, item.state)}>
            <ha-icon icon=${item.definition.icon}></ha-icon>
          </div>
          <span>${label}</span>
          <strong>${value}</strong>
        </button>
        ${isVisibleRenderable(control)
          ? html`<div class="display-button-control">${control}</div>`
          : nothing}
      </div>
    `;
  }

  private _groupCard(group: EntityGroup) {
    const rows = GROUP_KEYS[group.kind]
      .map((key) => this._groupEntityRow(group, key))
      .filter(isVisibleRenderable);
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
    return html`
      <button
        class="metric entity-action"
        type="button"
        ?disabled=${!entityId}
        aria-label=${`${label}: ${value}`}
        @click=${(event: MouseEvent) => this._handleTapAction(event, entityId)}
        @dblclick=${(event: MouseEvent) => this._handleDoubleTapAction(event, entityId)}
        @pointerdown=${(event: PointerEvent) => this._startHoldAction(event, entityId)}
        @pointerup=${this._finishHoldAction}
        @pointerleave=${this._cancelHoldAction}
        @pointercancel=${this._cancelHoldAction}
      >
        <div class=${this._iconBubbleClass(definition, state)}><ha-icon icon=${definition.icon}></ha-icon></div>
        <span>${label}</span>
        <strong>${value}</strong>
      </button>
    `;
  }

  private _entityRow(discovered: DiscoveredEntities, key: string): Renderable {
    const item = this._entity(discovered, key);
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
      <div class="entity-row ${busy ? "busy" : ""}" aria-busy=${String(busy)}>
        <button
          class="entity-main entity-action"
          type="button"
          ?disabled=${!entityId}
          aria-label=${`${label}: ${value}`}
          @click=${(event: MouseEvent) => this._handleTapAction(event, entityId)}
          @dblclick=${(event: MouseEvent) => this._handleDoubleTapAction(event, entityId)}
          @pointerdown=${(event: PointerEvent) => this._startHoldAction(event, entityId)}
          @pointerup=${this._finishHoldAction}
          @pointerleave=${this._cancelHoldAction}
          @pointercancel=${this._cancelHoldAction}
        >
          <div class=${this._iconBubbleClass(definition, state)}><ha-icon icon=${definition.icon}></ha-icon></div>
          <div class="main">
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        </button>
        ${isVisibleRenderable(control) ? html`<div class="row-control">${control}</div>` : nothing}
      </div>
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

  private _entity(discovered: DiscoveredEntities, key: string) {
    const definition = ENTITY_DEFINITION_BY_KEY[key] ?? FALLBACK_ENTITY_DEFINITION;
    const entityId = discovered.entityIds[key];
    const state = entityState(this.hass!, entityId);
    return { definition, entityId, state };
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
    const problemState = problem?.state.trim().toLowerCase();
    const hasProblem = Boolean(problem && (isUnavailable(problem) || booleanState(problem)));
    const tone = hasProblem ? "alert" : problemState === "off" ? "ok" : "neutral";
    const animate = Boolean(
      problem && !isUnavailable(problem) && booleanState(problem) && this._config.show_icon_animations,
    );
    return [
      "icon-bubble",
      "primary",
      tone,
      "active",
      animate ? `motion-${tone}` : "",
      animate ? "animated" : "",
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
