import { css } from "lit";

export const cardStyles = css`
  :host {
    --unifi-row-background: color-mix(
      in srgb,
      var(--card-background-color) 88%,
      var(--secondary-background-color)
    );
    --unifi-row-border: color-mix(in srgb, var(--divider-color) 78%, transparent);
    --unifi-row-hover: color-mix(in srgb, var(--primary-color) 7%, var(--unifi-row-background));
    --unifi-row-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    --unifi-ha-icon-bubble-size: 36px;
    --unifi-ha-icon-size: 20px;
    --unifi-ha-row-height: 48px;
    --unifi-ha-row-inner-height: 40px;
    --unifi-ha-tile-height: 56px;
    --unifi-layout-row-height: 24px;
    --unifi-layout-section-gap: 14px;
    --unifi-layout-column-gap: 14px;
    --unifi-focus-ring-color: color-mix(in srgb, var(--primary-color) 84%, white 16%);
    --unifi-ok-color: var(--success-color, #43a047);
    --unifi-alert-color: var(--error-color, #e53935);
    --unifi-neutral-color: var(--secondary-text-color);
    container-type: inline-size;
    display: block;
  }

  .unifi-card {
    color-scheme: light dark;
    overflow: hidden;
    padding: 16px;
    border: var(--ha-card-border-width, 0) solid
      var(--ha-card-border-color, var(--divider-color));
    border-radius: var(--ha-card-border-radius, 8px);
    background: var(--ha-card-background, var(--card-background-color));
    box-shadow: var(--ha-card-box-shadow, none);
    color: var(--primary-text-color);
    font-family: var(
      --primary-font-family,
      var(--paper-font-body1_-_font-family, Roboto, sans-serif)
    );
  }

  header,
  .title-block,
  .entity-row,
  .entity-main {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  header {
    justify-content: space-between;
    margin-bottom: 14px;
  }

  h2,
  h3,
  p {
    margin: 0;
    letter-spacing: 0;
  }

  h2 {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.2;
  }

  h3 {
    margin-bottom: 10px;
    color: var(--secondary-text-color);
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
  }

  p,
  span {
    color: var(--secondary-text-color);
    font-size: 13px;
    line-height: 1.3;
  }

  section {
    min-width: 0;
    padding: var(--unifi-layout-section-gap) 0;
    border-top: 1px solid var(--divider-color);
    content-visibility: auto;
    contain-intrinsic-size: auto 180px;
  }

  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-auto-flow: row dense;
    grid-auto-rows: minmax(var(--unifi-layout-row-height), auto);
    align-items: start;
    row-gap: var(--unifi-layout-section-gap);
    column-gap: var(--unifi-layout-column-gap);
  }

  .layout-dense {
    --unifi-layout-section-gap: 12px;
  }

  .unifi-card.compact {
    --unifi-ha-icon-bubble-size: 34px;
    --unifi-ha-icon-size: 18px;
    --unifi-ha-row-height: 44px;
    --unifi-ha-row-inner-height: 38px;
    --unifi-ha-tile-height: 52px;
    --unifi-layout-row-height: 20px;
    --unifi-layout-section-gap: 10px;
    --unifi-layout-column-gap: 10px;
    padding: 12px;
  }

  .unifi-card.compact header {
    margin-bottom: 8px;
  }

  .unifi-card.compact h2 {
    font-size: 18px;
  }

  .unifi-card.compact .metric {
    gap: 2px 8px;
    padding: 7px;
  }

  .unifi-card.compact .group-card {
    gap: 6px;
    padding: 8px;
  }

  .unifi-card.compact .display-button-tile {
    min-height: 96px;
  }

  .unifi-card.compact .display-button-main {
    gap: 5px;
    padding: 7px;
  }

  .unifi-card.compact .display-button-control {
    padding: 0 7px 7px;
  }

  .title-block,
  .metric,
  .entity-main,
  .display-button-main {
    appearance: none;
    min-width: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .title-block {
    flex: 1 1 auto;
    padding: 0;
  }

  .title-block:disabled,
  .metric:disabled,
  .entity-main:disabled,
  .display-button-main:disabled {
    cursor: default;
  }

  .error-banner {
    margin: 0 0 12px;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--error-color) 40%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, var(--error-color) 12%, transparent);
    color: var(--error-color);
    font-size: 13px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .usage-gauge {
    display: grid;
    flex: 0 0 auto;
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
    stroke: color-mix(in srgb, var(--divider-color) 70%, transparent);
  }

  .usage-gauge .value {
    stroke: var(--primary-color);
    stroke-linecap: round;
  }

  .usage-gauge strong {
    color: var(--primary-text-color);
    font-size: 12px;
    font-weight: 600;
  }

  .header-status.tone-alert {
    color: var(--unifi-alert-color);
  }

  .header-status.tone-ok {
    color: var(--unifi-ok-color);
  }

  .header-status.tone-neutral {
    color: var(--secondary-text-color);
  }

  .usage-gauge.tone-alert .value {
    stroke: var(--unifi-alert-color);
  }

  .usage-gauge.tone-alert strong {
    color: var(--unifi-alert-color);
  }

  .usage-gauge.tone-ok .value {
    stroke: var(--unifi-ok-color);
  }

  .usage-gauge.tone-ok strong {
    color: var(--unifi-ok-color);
  }

  .usage-gauge.tone-neutral .value {
    stroke: var(--unifi-neutral-color);
  }

  .metric-grid,
  .display-button-grid,
  .group-grid,
  .rows {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  .metric-grid {
    grid-template-columns: repeat(var(--unifi-overview-columns, 3), minmax(0, 1fr));
  }

  .metric {
    display: grid;
    grid-template-columns: var(--unifi-ha-icon-bubble-size) minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-items: center;
    box-sizing: border-box;
    min-width: 0;
    min-height: var(--unifi-ha-tile-height);
    gap: 2px 10px;
    padding: 8px;
    border: 1px solid var(--unifi-row-border);
    border-radius: 8px;
    background: var(--unifi-row-background);
    box-shadow: var(--unifi-row-shadow);
  }

  .metric span,
  .metric strong,
  .metric .metric-label,
  .metric .metric-value,
  .main strong,
  .main span,
  .display-button-main span,
  .display-button-main strong,
  .group-title strong,
  .group-header span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .metric span {
    grid-row: 1;
    grid-column: 2;
    position: relative;
    display: block;
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.2;
  }

  .metric strong {
    grid-row: 2;
    grid-column: 2;
    position: relative;
    display: block;
    justify-self: end;
    align-self: end;
    text-align: right;
    color: var(--primary-text-color);
    font-size: 16px;
    font-weight: 600;
    line-height: 1.25;
  }

  .metric .metric-label {
    grid-row: 1;
    grid-column: 2;
  }

  .metric .metric-value {
    grid-row: 2;
    grid-column: 2;
  }

  .metric .icon-bubble {
    grid-row: 1 / 3;
  }

  .entity-row,
  .group-card,
  .display-button-tile {
    box-sizing: border-box;
    min-width: 0;
    border: 1px solid var(--unifi-row-border);
    border-radius: 8px;
    background: var(--unifi-row-background);
    box-shadow: var(--unifi-row-shadow);
    transition:
      background 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  .entity-row {
    min-height: var(--unifi-ha-row-height);
    padding: 4px;
  }

  .entity-main {
    flex: 1;
    min-height: var(--unifi-ha-row-inner-height);
    padding: 0 6px;
    border-radius: 8px;
  }

  .main {
    display: grid;
    flex: 1;
    min-width: 0;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }

  .main strong {
    color: var(--primary-text-color);
    font-size: var(--paper-font-body1_-_font-size, 16px);
    font-weight: var(--paper-font-body1_-_font-weight, 400);
    line-height: var(--paper-font-body1_-_line-height, 1.5);
  }

  .main span {
    min-width: 0;
    justify-self: end;
    text-align: right;
    color: var(--secondary-text-color);
    font-size: 14px;
    line-height: 1.25;
  }

  .row-control {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
  }

  .row-control select {
    width: min(154px, 100%);
    max-width: 154px;
  }

  .group-grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .group-card {
    display: grid;
    gap: 8px;
    padding: 10px;
    background: color-mix(in srgb, var(--unifi-row-background) 82%, transparent);
  }

  .group-header,
  .group-title {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .group-header {
    justify-content: space-between;
    gap: 8px;
  }

  .group-title {
    gap: 8px;
  }

  .display-button-grid {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  }

  .display-button-tile {
    display: grid;
    grid-template-rows: 1fr auto;
    min-height: 104px;
  }

  .display-button-tile.active {
    border-color: color-mix(in srgb, var(--primary-color) 46%, var(--unifi-row-border));
    background: color-mix(in srgb, var(--primary-color) 10%, var(--unifi-row-background));
  }

  .metric.tone-alert,
  .entity-row.tone-alert,
  .display-button-tile.tone-alert {
    border-color: color-mix(in srgb, var(--unifi-alert-color) 44%, var(--unifi-row-border));
    background: color-mix(in srgb, var(--unifi-alert-color) 7%, var(--unifi-row-background));
  }

  .metric.tone-ok,
  .entity-row.tone-ok,
  .display-button-tile.tone-ok {
    border-color: color-mix(in srgb, var(--unifi-ok-color) 36%, var(--unifi-row-border));
    background: color-mix(in srgb, var(--unifi-ok-color) 5%, var(--unifi-row-background));
  }

  .metric.tone-alert strong,
  .display-button-tile.tone-alert .display-button-main strong,
  .entity-row.tone-alert .main span {
    color: var(--unifi-alert-color);
  }

  .metric.tone-ok strong,
  .display-button-tile.tone-ok .display-button-main strong,
  .entity-row.tone-ok .main span {
    color: var(--unifi-ok-color);
  }

  .display-button-tile.tone-alert.active {
    border-color: color-mix(in srgb, var(--unifi-alert-color) 56%, var(--unifi-row-border));
    background: color-mix(in srgb, var(--unifi-alert-color) 12%, var(--unifi-row-background));
  }

  .display-button-tile.tone-ok.active {
    border-color: color-mix(in srgb, var(--unifi-ok-color) 50%, var(--unifi-row-border));
    background: color-mix(in srgb, var(--unifi-ok-color) 10%, var(--unifi-row-background));
  }

  .display-button-main {
    display: grid;
    align-content: start;
    justify-items: start;
    gap: 6px;
    padding: 8px;
    border-radius: 8px;
  }

  .display-button-main span,
  .display-button-main strong {
    width: 100%;
  }

  .display-button-main span {
    font-size: 12px;
  }

  .display-button-main strong {
    justify-self: end;
    text-align: right;
    color: var(--primary-text-color);
    font-size: 15px;
    font-weight: 500;
  }

  .display-button-control {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0 8px 8px;
  }

  .display-button-control > * {
    flex: 1 1 auto;
    min-width: 0;
  }

  button,
  select,
  input {
    font: inherit;
  }

  button {
    border: 0;
    color: var(--primary-text-color);
    background: color-mix(in srgb, var(--secondary-background-color) 86%, transparent);
    cursor: pointer;
  }

  button:disabled,
  input:disabled,
  select:disabled {
    cursor: default;
    opacity: 0.62;
  }

  button.chip {
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }

  button.active,
  button.chip:hover {
    background: color-mix(in srgb, var(--primary-color) 18%, transparent);
    color: var(--primary-color);
  }

  input,
  select {
    box-sizing: border-box;
    min-height: 36px;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
  }

  input[type="number"],
  input[type="time"] {
    width: min(180px, 38vw);
    padding: 6px 8px;
    text-align: center;
  }

  select {
    width: min(190px, 34vw);
    min-width: 0;
    padding: 6px 8px;
  }

  .display-button-control input,
  .display-button-control select,
  .display-button-control button.chip {
    width: 100%;
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--unifi-focus-ring-color);
    outline-offset: 2px;
  }

  .display-button-tile.busy,
  .entity-row.busy,
  .group-card.busy {
    border-color: color-mix(in srgb, var(--primary-color) 36%, var(--unifi-row-border));
  }

  .entity-action {
    transition:
      background 160ms ease,
      color 160ms ease;
  }

  .entity-action:not(:disabled):hover .icon-bubble,
  .entity-action:not(:disabled):focus-visible .icon-bubble {
    transform: translateY(-1px);
    box-shadow:
      0 0 0 1px rgba(var(--unifi-icon-rgb), 0.42),
      0 6px 16px rgba(var(--unifi-icon-rgb), 0.2);
  }

  .entity-row:hover,
  .entity-row:focus-within,
  .group-card:hover,
  .group-card:focus-within,
  .display-button-tile:hover,
  .display-button-tile:focus-within,
  .metric:hover,
  .metric:focus-visible {
    border-color: color-mix(in srgb, var(--primary-color) 40%, var(--unifi-row-border));
    background: var(--unifi-row-hover);
    box-shadow:
      var(--unifi-row-shadow),
      0 2px 10px rgba(0, 0, 0, 0.08);
  }

  .icon-bubble {
    --unifi-icon-rgb: 3, 155, 229;
    --unifi-icon-color: rgb(var(--unifi-icon-rgb));
    position: relative;
    display: inline-flex;
    flex: 0 0 var(--unifi-ha-icon-bubble-size);
    align-items: center;
    justify-content: center;
    width: var(--unifi-ha-icon-bubble-size);
    height: var(--unifi-ha-icon-bubble-size);
    overflow: hidden;
    border-radius: 999px;
    background: rgba(var(--unifi-icon-rgb), 0.18);
    color: var(--unifi-icon-color);
    --state-icon-color: var(--unifi-icon-color);
    --paper-item-icon-color: var(--unifi-icon-color);
    --iron-icon-fill-color: var(--unifi-icon-color);
    --mdc-icon-size: var(--unifi-ha-icon-size);
    box-shadow:
      inset 0 0 0 1px rgba(var(--unifi-icon-rgb), 0.22),
      0 0 0 rgba(var(--unifi-icon-rgb), 0);
    transition:
      background 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .icon-bubble ha-icon {
    position: relative;
    z-index: 1;
    color: var(--unifi-icon-color) !important;
    fill: var(--unifi-icon-color) !important;
    will-change: transform, filter;
  }

  .icon-bubble.animated::after {
    position: absolute;
    inset: 5px;
    border-radius: inherit;
    background: currentColor;
    content: "";
    opacity: 0.2;
    will-change: transform, opacity, clip-path;
  }

  .icon-bubble.primary {
    --unifi-icon-rgb: 255, 255, 255;
    --unifi-icon-color: var(--text-primary-color, #ffffff);
    background: linear-gradient(135deg, #0288d1, #26c6da);
    color: var(--unifi-icon-color);
    box-shadow: 0 8px 18px rgba(3, 155, 229, 0.28);
  }

  .icon-bubble.primary.alert {
    background: linear-gradient(135deg, #ef6c00, #e53935);
    box-shadow: 0 8px 18px rgba(229, 57, 53, 0.26);
  }

  .icon-bubble.primary.neutral {
    background: linear-gradient(135deg, #546e7a, #78909c);
    box-shadow: 0 8px 18px rgba(84, 110, 122, 0.24);
  }

  .icon-bubble.primary.ok {
    background: linear-gradient(135deg, #2e7d32, #43a047);
    box-shadow: 0 8px 18px rgba(67, 160, 71, 0.26);
  }

  .icon-bubble.active {
    background: rgba(var(--unifi-icon-rgb), 0.28);
    box-shadow:
      0 0 0 1px rgba(var(--unifi-icon-rgb), 0.46),
      0 0 18px rgba(var(--unifi-icon-rgb), 0.18),
      inset 0 0 18px rgba(var(--unifi-icon-rgb), 0.24);
  }

  .icon-bubble.primary.active {
    background: linear-gradient(135deg, #0277bd, #00acc1);
  }

  .icon-bubble.primary.alert.active {
    background: linear-gradient(135deg, #ef6c00, #e53935);
  }

  .icon-bubble.primary.neutral.active {
    background: linear-gradient(135deg, #546e7a, #78909c);
  }

  .icon-bubble.primary.ok.active {
    background: linear-gradient(135deg, #2e7d32, #43a047);
  }

  .icon-bubble.action {
    --unifi-icon-rgb: 92, 107, 192;
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

  .icon-bubble.neutral {
    --unifi-icon-rgb: 120, 144, 156;
  }

  .icon-bubble.ok {
    --unifi-icon-rgb: 67, 160, 71;
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

  .icon-bubble.animated ha-icon {
    filter: drop-shadow(0 0 5px rgba(var(--unifi-icon-rgb), 0.58));
  }

  .icon-bubble.animated.motion-storage::after,
  .icon-bubble.animated.motion-network::after {
    background: linear-gradient(180deg, transparent 42%, currentColor 44%);
    animation: unifi-data-fill 3.2s ease-in-out infinite;
  }

  .icon-bubble.animated.motion-storage ha-icon,
  .icon-bubble.animated.motion-network ha-icon {
    animation: unifi-icon-float 3.2s ease-in-out infinite;
  }

  .icon-bubble.animated.motion-drive::after {
    inset: 9px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    background: transparent;
    animation: unifi-orbit 2.4s linear infinite;
  }

  .icon-bubble.animated.motion-drive ha-icon {
    animation: unifi-icon-float 2.6s ease-in-out infinite;
  }

  .icon-bubble.animated.motion-snapshot::after {
    animation: unifi-snapshot-pulse 2.5s ease-out infinite;
  }

  .icon-bubble.animated.motion-system::after,
  .icon-bubble.animated.motion-update::after {
    animation: unifi-status-signal 2.4s steps(4, end) infinite;
  }

  .icon-bubble.animated.motion-temperature ha-icon {
    transform-origin: 50% 85%;
    animation: unifi-heat-flicker 2.1s ease-in-out infinite;
  }

  .icon-bubble.animated.motion-temperature::after {
    background:
      radial-gradient(circle at 45% 72%, currentColor 0 12%, transparent 13%),
      radial-gradient(circle at 58% 65%, currentColor 0 10%, transparent 11%);
    animation: unifi-heat-steam 2.1s ease-in-out infinite;
  }

  .icon-bubble.animated.motion-alert ha-icon {
    transform-origin: 50% 80%;
    animation: unifi-alert-shake 1.45s ease-in-out infinite;
  }

  .icon-bubble.animated.motion-alert::after {
    animation: unifi-alert-pulse 1.45s ease-in-out infinite;
  }

  .icon-bubble.animated.motion-action ha-icon {
    animation: unifi-icon-float 2.4s ease-in-out infinite;
  }

  @container (min-width: 720px) {
    .unifi-card {
      padding: 18px;
    }

    .content-grid {
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--unifi-layout-column-gap, 16px);
    }

    .content-grid > .card-section {
      grid-column: span 6;
    }

    .content-grid > [data-section="overview"] {
      grid-column: 1 / -1;
    }

    .content-grid > [data-section="storage"],
    .content-grid > [data-section="pools"],
    .content-grid > [data-section="drives"],
    .content-grid > [data-section="snapshots"] {
      grid-column: span 7;
    }

    .content-grid > [data-section="system"],
    .content-grid > [data-section="updates"],
    .content-grid > [data-section="diagnostics"],
    .content-grid > [data-section="actions"] {
      grid-column: span 5;
    }

    .unifi-card.layout-dense .content-grid > [data-section="storage"],
    .unifi-card.layout-dense .content-grid > [data-section="pools"],
    .unifi-card.layout-dense .content-grid > [data-section="drives"],
    .unifi-card.layout-dense .content-grid > [data-section="snapshots"] {
      grid-column: span 8;
    }

    .unifi-card.layout-dense .content-grid > [data-section="system"],
    .unifi-card.layout-dense .content-grid > [data-section="updates"],
    .unifi-card.layout-dense .content-grid > [data-section="diagnostics"] {
      grid-column: span 4;
    }

    .unifi-card.layout-dense .content-grid > [data-section="actions"] {
      grid-column: span 8;
    }

    .rows.entity-list {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .display-button-grid {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
    }

    .group-grid {
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }
  }

  @container (min-width: 1060px) {
    .unifi-card {
      --unifi-layout-column-gap: 18px;
    }

    .content-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .unifi-card.layout-dense .content-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .content-grid > [data-section] {
      grid-column: span 1;
    }

    .content-grid > [data-section="overview"] {
      grid-column: 1 / -1;
    }

    .content-grid > [data-section="storage"],
    .content-grid > [data-section="pools"],
    .content-grid > [data-section="drives"],
    .content-grid > [data-section="snapshots"] {
      grid-column: span 2;
    }

    .unifi-card.layout-dense .content-grid > [data-section="system"],
    .unifi-card.layout-dense .content-grid > [data-section="updates"],
    .unifi-card.layout-dense .content-grid > [data-section="diagnostics"] {
      grid-column: span 1;
    }

    .unifi-card.layout-dense .content-grid > [data-section="actions"] {
      grid-column: span 2;
    }
  }

  @container (max-width: 360px) {
    .metric-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .entity-row {
      gap: 8px;
    }

    .entity-main {
      gap: 8px;
      padding: 0 2px;
    }

    input[type="number"] {
      width: 68px;
    }

    .entity-row input[type="text"],
    .entity-row select {
      width: min(112px, 100%);
    }

    .row-control select {
      width: 112px;
      max-width: 112px;
    }
  }

  @media (max-width: 520px) {
    .unifi-card {
      padding: 12px;
      --unifi-layout-section-gap: 10px;
    }

    header {
      align-items: flex-start;
    }

    .entity-row {
      gap: 8px;
    }

    .entity-main {
      gap: 8px;
    }
  }

  @container (max-width: 390px) {
    .metric-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .icon-bubble,
    .icon-bubble::after,
    .icon-bubble ha-icon {
      animation: none !important;
    }
  }

  @keyframes unifi-data-fill {
    0%,
    100% {
      clip-path: inset(62% 0 0 0 round 999px);
      transform: translateY(4px);
      opacity: 0.14;
    }
    50% {
      clip-path: inset(22% 0 0 0 round 999px);
      transform: translateY(-3px);
      opacity: 0.26;
    }
  }

  @keyframes unifi-icon-float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-2.5px);
    }
  }

  @keyframes unifi-orbit {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes unifi-snapshot-pulse {
    0% {
      transform: scale(0.55);
      opacity: 0.22;
    }
    100% {
      transform: scale(1.45);
      opacity: 0;
    }
  }

  @keyframes unifi-status-signal {
    0% {
      clip-path: circle(12% at 50% 72%);
      opacity: 0.1;
    }
    35% {
      clip-path: circle(34% at 50% 72%);
      opacity: 0.2;
    }
    70% {
      clip-path: circle(58% at 50% 72%);
      opacity: 0.28;
    }
    100% {
      clip-path: circle(80% at 50% 72%);
      opacity: 0.06;
    }
  }

  @keyframes unifi-heat-flicker {
    0%,
    100% {
      transform: translateY(0) scale(1) rotate(0);
      filter: drop-shadow(0 0 2px currentColor);
    }
    30% {
      transform: translateY(-1px) scale(1.08) rotate(-2deg);
      filter: drop-shadow(0 0 7px currentColor);
    }
    58% {
      transform: translateY(1px) scale(0.98) rotate(2deg);
      filter: drop-shadow(0 0 4px currentColor);
    }
  }

  @keyframes unifi-heat-steam {
    0% {
      transform: translateY(7px) scale(0.72);
      opacity: 0;
    }
    35% {
      opacity: 0.24;
    }
    100% {
      transform: translateY(-7px) scale(1.08);
      opacity: 0;
    }
  }

  @keyframes unifi-alert-shake {
    0%,
    100% {
      transform: rotate(0);
    }
    20% {
      transform: rotate(-8deg);
    }
    35% {
      transform: rotate(7deg);
    }
    50% {
      transform: rotate(-4deg);
    }
  }

  @keyframes unifi-alert-pulse {
    0%,
    100% {
      transform: scale(0.72);
      opacity: 0.12;
    }
    45% {
      transform: scale(1.28);
      opacity: 0.32;
    }
  }
`;
