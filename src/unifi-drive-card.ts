import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import {
  DIAGNOSTIC_KEYS,
  ENTITY_DEFINITION_BY_KEY,
  FALLBACK_ENTITY_DEFINITION,
  OVERVIEW_KEYS,
  STORAGE_KEYS,
  SYSTEM_KEYS,
  UPDATE_KEYS,
} from "./catalog";
import { callEntityService, installUpdate, selectOption, serviceForToggle, setNumberValue, setTimeValue } from "./actions";
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
        ${this._sectionEnabled("overview") ? this._renderOverview(discovered) : nothing}
        ${this._sectionEnabled("storage") ? this._renderKeyRows("storage", discovered, STORAGE_KEYS) : nothing}
        ${this._sectionEnabled("pools") ? this._renderGroupSection("pools", discovered.groups.pool) : nothing}
        ${this._sectionEnabled("drives") ? this._renderGroupSection("drives", discovered.groups.drive) : nothing}
        ${this._sectionEnabled("snapshots") ? this._renderGroupSection("snapshots", discovered.groups.snapshot) : nothing}
        ${this._sectionEnabled("system") ? this._renderKeyRows("system", discovered, SYSTEM_KEYS) : nothing}
        ${this._sectionEnabled("updates") ? this._renderKeyRows("updates", discovered, UPDATE_KEYS) : nothing}
        ${this._sectionEnabled("diagnostics") && this._config.show_diagnostics
          ? this._renderKeyRows("diagnostics", discovered, DIAGNOSTIC_KEYS)
          : nothing}
        ${this._sectionEnabled("actions") ? this._renderGroupSection("actions", discovered.groups.backup) : nothing}
      </ha-card>
    `;
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
    const tiles = OVERVIEW_KEYS.map((key) => this._entity(discovered, key)).filter((item) =>
      this._canRender(item.definition, item.state),
    );
    if (!tiles.length) {
      return nothing;
    }
    return html`
      <section class="section-overview">
        <div class="metric-grid">
          ${tiles.map(({ definition, entityId, state }) => this._metricTile(definition, entityId, state))}
        </div>
      </section>
    `;
  }

  private _renderKeyRows(section: SectionId, discovered: DiscoveredEntities, keys: string[]) {
    const rows = keys.map((key) => this._entityRow(discovered, key)).filter(isVisibleRenderable);
    if (!rows.length) {
      return nothing;
    }
    return html`
      <section class=${`section-${section}`}>
        <h3>${sectionLabel(section, this.hass)}</h3>
        <div class="rows entity-list">${rows.slice(0, this._config.max_sensor_rows)}</div>
      </section>
    `;
  }

  private _renderGroupSection(section: SectionId, groups: EntityGroup[]) {
    const renderedGroups = groups.map((group) => this._groupCard(group)).filter(isVisibleRenderable);
    if (!renderedGroups.length) {
      return nothing;
    }
    return html`
      <section class=${`section-${section}`}>
        <h3>${sectionLabel(section, this.hass)}</h3>
        <div class="group-grid">${renderedGroups}</div>
      </section>
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
    return [
      "icon-bubble",
      "primary",
      problem && !isUnavailable(problem) && booleanState(problem) ? "alert" : "storage",
      "active",
      this._config.show_icon_animations ? "animated" : "",
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

  private _sectionEnabled(section: SectionId): boolean {
    return this._config.sections.includes(section);
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

  static override styles = css`
    :host {
      display: block;
      container-type: inline-size;
      --unifi-row-background: color-mix(
        in srgb,
        var(--card-background-color, var(--ha-card-background, #fff)) 92%,
        var(--secondary-background-color, #f5f5f5)
      );
      --unifi-row-border: color-mix(in srgb, var(--divider-color, #ddd) 80%, transparent);
      --unifi-row-hover: color-mix(in srgb, var(--primary-color, #03a9f4) 7%, var(--unifi-row-background));
      --unifi-icon-size: 36px;
    }

    .unifi-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
      padding: 16px;
      overflow: hidden;
      color: var(--primary-text-color);
      font-family: var(--ha-font-family-body, inherit);
    }

    .unifi-card.compact {
      gap: 12px;
      padding: 12px;
    }

    header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
    }

    .title-block,
    .metric,
    .entity-main {
      appearance: none;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .title-block {
      display: grid;
      grid-template-columns: var(--unifi-icon-size) 1fr;
      gap: 12px;
      align-items: center;
      min-width: 0;
      padding: 0;
    }

    .title-block:disabled,
    .metric:disabled,
    .entity-main:disabled {
      cursor: default;
    }

    h2,
    h3,
    p {
      margin: 0;
    }

    h2 {
      font-size: 20px;
      line-height: 1.2;
      font-weight: 600;
      letter-spacing: 0;
    }

    header p,
    .main span,
    .metric span,
    .group-header span {
      overflow-wrap: anywhere;
      color: var(--secondary-text-color);
      font-size: 13px;
      line-height: 1.3;
    }

    section {
      display: grid;
      gap: 10px;
    }

    section h3 {
      color: var(--secondary-text-color);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .error-banner {
      padding: 10px 12px;
      border: 1px solid color-mix(in srgb, var(--error-color, #db4437) 40%, transparent);
      border-radius: 8px;
      background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);
      color: var(--error-color, #db4437);
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .usage-gauge {
      display: grid;
      justify-items: center;
      gap: 2px;
      min-width: 58px;
    }

    .usage-gauge svg {
      width: 44px;
      height: 44px;
      transform: rotate(-90deg);
    }

    .usage-gauge circle {
      fill: none;
      stroke-width: 4;
    }

    .usage-gauge .track {
      stroke: color-mix(in srgb, var(--divider-color, #ddd) 70%, transparent);
    }

    .usage-gauge .value {
      stroke: var(--primary-color, #03a9f4);
      stroke-linecap: round;
    }

    .usage-gauge strong {
      font-size: 12px;
      font-weight: 600;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
      gap: 8px;
    }

    .metric {
      display: grid;
      grid-template-columns: var(--unifi-icon-size) 1fr;
      gap: 10px;
      align-items: center;
      min-height: 64px;
      min-width: 0;
      padding: 10px;
      border: 1px solid var(--unifi-row-border);
      border-radius: 8px;
      background: var(--unifi-row-background);
    }

    .metric .icon-bubble {
      grid-row: 1 / span 2;
    }

    .metric strong {
      display: block;
      grid-column: 2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 18px;
      line-height: 1.15;
    }

    .rows,
    .group-grid {
      display: grid;
      gap: 8px;
      min-width: 0;
    }

    .group-grid {
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }

    .group-card {
      display: grid;
      gap: 8px;
      min-width: 0;
      padding: 10px;
      border: 1px solid var(--unifi-row-border);
      border-radius: 8px;
      background: color-mix(in srgb, var(--unifi-row-background) 82%, transparent);
    }

    .group-header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }

    .group-title {
      display: flex;
      gap: 8px;
      align-items: center;
      min-width: 0;
    }

    .group-title strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-row {
      container-type: inline-size;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      min-height: 52px;
      padding: 6px;
      border: 1px solid var(--unifi-row-border);
      border-radius: 8px;
      background: var(--unifi-row-background);
    }

    .entity-main {
      display: grid;
      grid-template-columns: var(--unifi-icon-size) minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      min-width: 0;
      padding: 0;
    }

    .entity-main strong,
    .main span {
      overflow-wrap: break-word;
      word-break: normal;
    }

    .row-control {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      min-width: 0;
    }

    .chip,
    input,
    select {
      box-sizing: border-box;
      min-height: 36px;
      border: 1px solid var(--unifi-row-border);
      border-radius: 8px;
      background: var(--card-background-color, var(--ha-card-background, #fff));
      color: var(--primary-text-color);
      font: inherit;
    }

    .chip {
      padding: 0 12px;
      cursor: pointer;
      white-space: nowrap;
    }

    .chip.active {
      border-color: color-mix(in srgb, var(--primary-color, #03a9f4) 50%, var(--unifi-row-border));
      background: color-mix(in srgb, var(--primary-color, #03a9f4) 15%, transparent);
      color: var(--primary-color, #03a9f4);
    }

    input,
    select {
      width: min(180px, 38vw);
      padding: 6px 8px;
    }

    button:focus-visible,
    input:focus-visible,
    select:focus-visible {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: 2px;
    }

    button:disabled,
    input:disabled,
    select:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .busy {
      opacity: 0.75;
    }

    .icon-bubble {
      --unifi-icon-rgb: 3, 155, 229;
      --unifi-icon-color: rgb(var(--unifi-icon-rgb));
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--unifi-icon-size);
      height: var(--unifi-icon-size);
      border-radius: 50%;
      background: rgba(var(--unifi-icon-rgb), 0.16);
      color: var(--unifi-icon-color);
      --state-icon-color: var(--unifi-icon-color);
      --paper-item-icon-color: var(--unifi-icon-color);
      --iron-icon-fill-color: var(--unifi-icon-color);
      --mdc-icon-size: 20px;
    }

    .icon-bubble ha-icon {
      color: var(--unifi-icon-color) !important;
      fill: var(--unifi-icon-color) !important;
    }

    .icon-bubble.primary {
      --unifi-icon-rgb: 255, 255, 255;
      color: var(--text-primary-color, #fff);
      background: var(--primary-color, #03a9f4);
    }

    .icon-bubble.alert {
      --unifi-icon-rgb: 229, 57, 53;
    }

    .icon-bubble.drive {
      --unifi-icon-rgb: 92, 107, 192;
    }

    .icon-bubble.network {
      --unifi-icon-rgb: 0, 172, 193;
    }

    .icon-bubble.snapshot {
      --unifi-icon-rgb: 126, 87, 194;
    }

    .icon-bubble.storage {
      --unifi-icon-rgb: 3, 155, 229;
    }

    .icon-bubble.system {
      --unifi-icon-rgb: 0, 150, 136;
    }

    .icon-bubble.temperature {
      --unifi-icon-rgb: 244, 128, 36;
    }

    .icon-bubble.update {
      --unifi-icon-rgb: 67, 160, 71;
    }

    .icon-bubble.animated.active {
      animation: unifi-breathe 2.7s ease-in-out infinite;
    }

    @media (hover: hover) {
      .metric:not(:disabled):hover,
      .entity-row:hover {
        background: var(--unifi-row-hover);
      }
    }

    @container (min-width: 720px) {
      .unifi-card {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: start;
      }

      header,
      .error-banner,
      .section-overview {
        grid-column: 1 / -1;
      }

      .section-overview {
        order: 10;
      }

      .section-storage {
        order: 20;
      }

      .section-system {
        order: 30;
      }

      .section-updates {
        order: 40;
      }

      .section-diagnostics {
        order: 50;
      }

      .section-pools {
        order: 60;
      }

      .section-drives {
        order: 70;
      }

      .section-snapshots {
        order: 80;
      }

      .section-actions {
        order: 90;
      }

      .metric-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .entity-list {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .section-system .entity-list {
        grid-template-columns: 1fr;
      }

      .group-grid {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
    }

    @container (min-width: 1040px) {
      .unifi-card {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .section-storage,
      .section-system,
      .section-updates,
      .section-diagnostics,
      .section-actions {
        grid-column: span 1;
      }

      .section-pools,
      .section-snapshots {
        grid-column: span 2;
      }

      .metric-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }
    }

    @media (max-width: 560px) {
      .unifi-card {
        padding: 12px;
      }

      header {
        grid-template-columns: 1fr;
      }

      .usage-gauge {
        justify-self: start;
        grid-template-columns: auto auto;
        align-items: center;
      }

      .entity-row {
        grid-template-columns: 1fr;
      }

      .row-control {
        justify-content: stretch;
      }

      .chip,
      input,
      select {
        width: 100%;
      }
    }

    @container (max-width: 340px) {
      .entity-main,
      .row-control {
        grid-column: 1 / -1;
      }

      .row-control {
        justify-content: stretch;
      }

      .chip,
      input,
      select {
        width: 100%;
      }
    }

    @keyframes unifi-breathe {
      0%,
      100% {
        box-shadow: 0 0 0 0 rgba(var(--unifi-icon-rgb), 0);
      }
      50% {
        box-shadow: 0 0 18px 2px rgba(var(--unifi-icon-rgb), 0.22);
      }
    }
  `;
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
