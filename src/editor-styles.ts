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
  .action-grid,
  .checks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 8px;
  }

  .action-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .action-card {
    display: grid;
    gap: 10px;
    padding: 10px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: color-mix(
      in srgb,
      var(--card-background-color) 88%,
      var(--secondary-background-color)
    );
  }

  .check {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .entity-editor,
  .sections-editor,
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

  .overview-entity-group,
  .sections-editor {
    min-width: 0;
  }

  .overview-entity-group h4 {
    margin: 0 0 6px;
    color: var(--secondary-text-color);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .overview-entity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 8px;
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

  .overview-entity-toggle span,
  .section-order-row span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .overview-editor h3,
  .sections-editor h3,
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

  .entity-visible span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 620px) {
    .entity-mapping-row {
      grid-template-columns: 1fr;
    }
  }
`;
