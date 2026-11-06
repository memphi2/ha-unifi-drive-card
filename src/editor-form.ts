import { html, type TemplateResult } from "lit";
import { localize } from "./i18n";
import type { HomeAssistant, Renderable } from "./types";

interface FoldoutOptions {
  className?: string;
  count?: string | number;
  helpKey?: string;
  open?: boolean;
  titleKey: string;
  content: Renderable;
}

export function editorFoldout(hass: HomeAssistant | undefined, options: FoldoutOptions) {
  const hasCount = options.count !== undefined;
  const helpText = options.helpKey ? localize(hass, options.helpKey) : undefined;
  const classes = ["editor-foldout", options.className].filter(Boolean).join(" ");
  return html`
    <details class=${classes} ?open=${Boolean(options.open)}>
      <summary>
        <span class="summary-label">
          <span>${localize(hass, options.titleKey)}</span>
          ${options.helpKey ? helpIcon(hass, options.helpKey) : ""}
        </span>
        ${hasCount || helpText
          ? html`
              <small class=${[
                "summary-meta",
                hasCount && helpText ? "with-count-and-help" : "",
              ]
                .filter(Boolean)
                .join(" ")}>
                ${hasCount ? html`<span class="summary-count">${options.count}</span>` : ""}
                ${helpText ? html`<span class="summary-help">${helpText}</span>` : ""}
              </small>
            `
          : ""}
      </summary>
      <div class="editor-foldout-content">${options.content}</div>
    </details>
  `;
}

export function formRow(
  hass: HomeAssistant | undefined,
  labelKey: string,
  helpKey: string | undefined,
  control: Renderable,
  className = "",
) {
  return html`
    <div class=${["ha-form-row", className].filter(Boolean).join(" ")}>
      ${fieldLabel(hass, labelKey, helpKey)}
      ${control}
    </div>
  `;
}

export function textareaRow(
  hass: HomeAssistant | undefined,
  labelKey: string,
  helpKey: string | undefined,
  control: Renderable,
) {
  return html`
    <div class="action-textarea-row">
      ${fieldLabel(hass, labelKey, helpKey)}
      ${control}
    </div>
  `;
}

export function switchFormField(
  hass: HomeAssistant | undefined,
  labelKeyOrText: string,
  checked: boolean,
  onChange: (event: Event) => void,
  options: {
    helpKey?: string;
    isLocalizedText?: boolean;
  } = {},
) {
  const label = options.isLocalizedText ? labelKeyOrText : localize(hass, labelKeyOrText);
  const help = options.helpKey ? localize(hass, options.helpKey) : undefined;
  const change = (event: Event): void => {
    event.stopPropagation();
    onChange(event);
  };
  return html`
    <div class="switch-formfield">
      <label class="switch-label" @click=${toggleSwitchLabel}>
        <ha-switch
          .checked=${checked}
          aria-label=${label}
          @click=${stopEvent}
          @change=${change}
        ></ha-switch>
        <span class="switch-formfield-label">${label}</span>
      </label>
      ${help ? helpIconText(help) : ""}
    </div>
  `;
}

function fieldLabel(
  hass: HomeAssistant | undefined,
  labelKey: string,
  helpKey?: string,
): TemplateResult {
  return html`
    <span class="field-label">
      <span>${localize(hass, labelKey)}</span>
      ${helpKey ? helpIcon(hass, helpKey) : ""}
    </span>
  `;
}

function helpIcon(hass: HomeAssistant | undefined, helpKey: string): TemplateResult {
  return helpIconText(localize(hass, helpKey));
}

let helpId = 0;

function helpIconText(help: string): TemplateResult {
  const id = `unifi-help-${++helpId}`;
  return html`
    <span class="help-control"
      @pointerenter=${showHelp}
      @focusout=${hideHelp}
    >
      <button
        class="help-icon"
        type="button"
        aria-label=${help}
        aria-describedby=${id}
        @click=${showHelp}
        @focus=${showHelp}
        @pointerdown=${stopEvent}
        @keydown=${stopSummaryToggleKeydown}
      >
        <ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon>
      </button>
      <span class="help-tooltip" id=${id} popover="auto" role="tooltip">${help}</span>
    </span>
  `;
}

function helpElements(event: Event) {
  const control = (event.currentTarget as HTMLElement).closest(".help-control");
  return {
    button: control?.querySelector<HTMLButtonElement>(".help-icon"),
    tooltip: control?.querySelector<HTMLElement>(".help-tooltip"),
  };
}

function showHelp(event: Event): void {
  event.stopPropagation();
  const { button, tooltip } = helpElements(event);
  if (!button || !tooltip?.showPopover) return;
  tooltip.showPopover();
  const anchor = button.getBoundingClientRect();
  const bounds = tooltip.getBoundingClientRect();
  const left = Math.max(12, Math.min(anchor.left, window.innerWidth - bounds.width - 12));
  const top = anchor.bottom + bounds.height + 8 <= window.innerHeight
    ? anchor.bottom + 8
    : Math.max(12, anchor.top - bounds.height - 8);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideHelp(event: Event): void {
  helpElements(event).tooltip?.hidePopover?.();
}

function stopEvent(event: Event): void {
  event.stopPropagation();
}

function toggleSwitchLabel(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  const control = (event.currentTarget as HTMLElement).querySelector("ha-switch") as
    (HTMLElement & { checked: boolean; disabled?: boolean }) | null;
  if (!control || control.disabled) return;
  control.checked = !control.checked;
  control.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}

function stopSummaryToggleKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.stopPropagation();
}
