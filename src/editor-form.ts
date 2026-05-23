import { html, type TemplateResult } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
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
    <ha-formfield
      class="switch-formfield"
      .label=${label}
      title=${help ?? label}
      aria-label=${help ?? label}
    >
      <ha-switch
        .checked=${checked}
        aria-label=${help ?? label}
        @click=${stopEvent}
        @change=${change}
      ></ha-switch>
      <span slot="label" class="switch-formfield-label">${label}</span>
      ${help ? helpIconText(help, "label") : ""}
    </ha-formfield>
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

function helpIconText(help: string, slot?: string): TemplateResult {
  return html`
    <button
      class="help-icon"
      type="button"
      slot=${ifDefined(slot)}
      title=${help}
      aria-label=${help}
      @click=${stopEvent}
      @pointerdown=${stopEvent}
      @keydown=${stopSummaryToggleKeydown}
    >
      <ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon>
    </button>
  `;
}

function stopEvent(event: Event): void {
  event.stopPropagation();
}

function stopSummaryToggleKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}
