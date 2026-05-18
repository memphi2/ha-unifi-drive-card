import { css } from "lit";

export const editorStyles = css`
  .editor {
    display: grid;
    gap: 16px;
  }

  label {
    display: grid;
    gap: 6px;
  }

  input[type="text"],
  input[type="number"],
  select,
  textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
  }

  textarea {
    min-height: 84px;
    resize: vertical;
    font-family: var(--code-font-family, monospace);
  }

  textarea.invalid {
    border-color: var(--error-color);
  }

  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .numeric-grid,
  .checks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
  }

  .actions-editor {
    display: grid;
    gap: 8px;
  }

  .action-list {
    display: grid;
    gap: 8px;
  }

  .action-card {
    overflow: hidden;
    padding: 0;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: color-mix(
      in srgb,
      var(--card-background-color) 88%,
      var(--secondary-background-color)
    );
  }

  .action-card summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    padding: 0 12px;
    cursor: pointer;
    list-style: none;
  }

  .action-card summary::-webkit-details-marker {
    display: none;
  }

  .action-card summary span {
    min-width: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .action-card summary small {
    flex: 0 0 auto;
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .action-card[open] summary {
    border-bottom: 1px solid var(--divider-color);
  }

  .action-fields {
    display: grid;
    gap: 10px;
    padding: 10px;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .check ha-switch,
  .entity-visible ha-switch {
    flex: 0 0 auto;
  }

  .switch-label {
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary-text-color);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .switch-label:hover,
  .switch-label:focus-visible {
    color: var(--primary-color);
  }

  .switch-label:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .editor-section,
  .entity-editor,
  .sections-editor,
  .actions-editor {
    display: grid;
    gap: 8px;
  }

  .editor-section {
    padding: 10px;
    border: 1px solid color-mix(in srgb, var(--divider-color) 72%, transparent);
    border-radius: 8px;
    background: color-mix(
      in srgb,
      var(--card-background-color) 88%,
      var(--secondary-background-color)
    );
  }

  .ha-form-list {
    display: grid;
    gap: 8px;
  }

  .ha-picker-control {
    display: block;
    min-width: 0;
    width: 100%;
  }

  .ha-form-row {
    display: grid;
    grid-template-columns: minmax(140px, 0.75fr) minmax(180px, 1.25fr);
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .ha-form-row > span {
    min-width: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .action-form-row {
    grid-template-columns: minmax(112px, 0.8fr) minmax(160px, 1.2fr);
  }

  .action-textarea-row {
    display: grid;
    gap: 6px;
  }

  .action-form-row > span,
  .action-textarea-row > span {
    min-width: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .helper-text {
    margin: 0;
    color: var(--secondary-text-color);
    font-size: 13px;
    line-height: 1.4;
  }

  .overview-editor {
    display: grid;
    gap: 8px;
  }

  .overview-editor p,
  .sections-editor p {
    margin: 0;
    color: var(--secondary-text-color);
    font-size: 13px;
    line-height: 1.4;
  }

  .overview-entity-groups {
    display: grid;
    gap: 10px;
  }

  .overview-entity-section,
  .overview-entity-group,
  .sections-editor {
    min-width: 0;
  }

  .overview-entity-section {
    overflow: hidden;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: color-mix(
      in srgb,
      var(--card-background-color) 88%,
      var(--secondary-background-color)
    );
  }

  .overview-entity-section summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    padding: 0 12px;
    cursor: pointer;
    list-style: none;
  }

  .overview-entity-section summary::-webkit-details-marker {
    display: none;
  }

  .overview-entity-section summary span {
    min-width: 0;
    overflow: hidden;
    color: var(--primary-text-color);
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .overview-entity-section summary small {
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .overview-entity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 8px;
  }

  .overview-order-list,
  .overview-entity-grid {
    padding: 8px;
    border-top: 1px solid var(--divider-color);
  }

  .order-list {
    display: grid;
    gap: 6px;
  }

  .order-row,
  .overview-entity-toggle {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 8px;
    border: 1px solid color-mix(in srgb, var(--divider-color) 72%, transparent);
    border-radius: 8px;
    background: color-mix(
      in srgb,
      var(--card-background-color) 88%,
      var(--secondary-background-color)
    );
  }

  .overview-entity-grid .overview-entity-toggle {
    grid-template-columns: minmax(0, 1fr);
  }

  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--secondary-text-color);
    cursor: grab;
  }

  .drag-handle:hover:not(:disabled),
  .drag-handle:focus-visible:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
    color: var(--primary-color);
  }

  .drag-handle:active:not(:disabled) {
    cursor: grabbing;
  }

  .drag-handle:disabled {
    cursor: default;
    opacity: 0.38;
  }

  .drag-handle ha-icon {
    --mdc-icon-size: 20px;
  }

  .overview-entity-toggle .switch-label,
  .section-order-row .switch-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-section h3,
  .overview-editor h3,
  .sections-editor h3,
  .actions-editor h3,
  .entity-editor h3 {
    margin: 0;
    color: var(--secondary-text-color);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .order-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--secondary-text-color);
    cursor: pointer;
  }

  .icon-button:hover:not(:disabled),
  .icon-button:focus-visible:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
    color: var(--primary-color);
  }

  .icon-button:disabled {
    cursor: default;
    opacity: 0.38;
  }

  .icon-button ha-icon {
    --mdc-icon-size: 20px;
  }

  .entity-section {
    overflow: hidden;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: color-mix(
      in srgb,
      var(--card-background-color) 88%,
      var(--secondary-background-color)
    );
  }

  .entity-section summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    padding: 0 12px;
    cursor: pointer;
    list-style: none;
  }

  .entity-section summary::-webkit-details-marker {
    display: none;
  }

  .entity-section small {
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .entity-mapping-list {
    display: grid;
    gap: 6px;
    padding: 8px;
    border-top: 1px solid var(--divider-color);
  }

  .entity-mapping-row {
    display: grid;
    grid-template-columns: minmax(180px, 0.9fr) minmax(180px, 1.1fr);
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 6px;
    border: 1px solid color-mix(in srgb, var(--divider-color) 72%, transparent);
    border-radius: 8px;
    background: var(--card-background-color);
  }

  .entity-visible {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 2px 8px;
    min-width: 0;
  }

  .entity-visible .switch-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (min-width: 560px) {
    .checks,
    .section-order-list,
    .overview-entity-groups {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 459px) {
    .ha-form-row,
    .action-form-row,
    .entity-mapping-row {
      grid-template-columns: 1fr;
    }
  }
`;
