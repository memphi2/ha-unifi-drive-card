# Changelog

## Unreleased

### Changed

- None pending.

## 0.3.3 - 2026-05-29

### Fixed

- Improved overview metric text stability by explicitly separating metric label
  and value rendering classes, avoiding cramped/overlap behavior in narrow
  card widths.
- Aligned regular entity-row label typography with Home Assistant body text
  tokens so labels match native HA styling while keeping value readability.
- Refined non-overview value sizing for better scanability without changing row
  control behavior.

## 0.3.2 - 2026-05-29

### Fixed

- Corrected dangerous-action editor behavior so enabling one dangerous entity
  while `show_dangerous_actions` is off keeps the other dangerous entities
  hidden instead of enabling them implicitly.
- Updated editor tests to cover the dangerous-entity single-selection flow and
  prevent regressions for this state transition.

## 0.3.1 - 2026-05-29

### Changed

- Fixed editor visibility behavior for dangerous entities so shutdown/restart
  toggles and `show_dangerous_actions` stay synchronized in GUI mode.
- Added editor coverage to assert dangerous-action visibility and toggle flow
  behavior.
- Hardened Home Assistant deploy smoke for GVFS/CIFS targets by falling back
  from `copyFile` to buffered write when the target filesystem rejects
  copyfile operations.

## 0.3.0 - 2026-05-25

### Changed

- Aligned editor behavior and structure with the current `ha-dhe-connect-card`
  baseline, including section/entity management flow and interaction parity.
- Refactored section and overview editor internals to reduce duplication and
  keep rendering logic modular and easier to maintain.
- Hardened runtime/editor hot paths with targeted caching for hidden entities,
  entity overrides and discovery-config signatures.
- Improved shared editor event handling to robustly parse `value`, `device_id`
  and `deviceId` payload variants.
- Expanded tests for shared editor helpers and parity-sensitive editor/render
  behavior.
- Revalidated release readiness with full CI checks, browser smoke and Home
  Assistant install/uninstall plus live entity audit checks.

## 0.2.3 - 2026-05-23

### Changed

- Fixed section render-cache invalidation for busy action states so row/button
  busy and disabled indicators stay in sync during service calls.
- Kept entities without registry `device_id` discoverable when a card `device_id`
  is configured, filtering only explicit device mismatches.
- Extended section cache signatures with locale and formatter dependencies so
  language/format updates re-render immediately.
- Improved user-facing documentation with clearer setup, configuration recipes
  and troubleshooting checklists.
- Completed CI, compatibility, anonymization, security audit, browser smoke and
  HA install/uninstall smoke validation before release publication.

## 0.2.2 - 2026-05-19

### Changed

- Removed redundant internal exports to reduce surface area for HACS packaging.
- Refactored internal discovery/render helpers to avoid duplicate code paths.
- Kept compact and responsive card behavior aligned with DHE-connect parity while
  preserving dashboard resize-driven layout updates.
- Updated release readiness and compliance checks as part of the final HACS
  release prep.

## 0.2.1 - 2026-05-18

### Changed

- Removed obsolete `max_sensor_rows` setting and stopped truncating list/button rows.
- Made the device picker in the editor the required discovery selector for multi-device setups.
- Swapped at-risk drive icon assignments to non-empty Material Design Icons to avoid blank icon rendering.
- Kept release metadata and discovery behavior in sync with the next patch release.

## 0.2.0 - 2026-05-18

### Changed

- Deepened editor modularization by extracting shared parsing helpers and common
  action/render helpers, keeping behavior aligned to DHE-style editor patterns.
- Refined entity and action editing paths to use shared selector parsing and safer
  event handling.
- Reworked overview and section order controls into reusable UI handlers while
  preserving drag/drop and move behavior.
- Consolidated editor unit tests with shared helpers and clearer setup helpers.
- Improved release validation resilience by making release checks version-aware.
- Refined editor test stability for action/configuration workflows and drop targets.

## 0.1.0 - 2026-05-17

### Added

- Initial UniFi Drive / UNAS Lovelace card.
- Automatic entity discovery for aggregate storage, system and update entities.
- Dynamic grouping for pools, drives, snapshot targets and backup task buttons.
- Native controls for switches, buttons, numbers, selects, time entities and updates.
- Safe dangerous-action handling for restart and shutdown.
- Width-aware responsive layout that reorders blocks for narrow and wide dashboard cards.
- Visual editor for sections, actions, entity overrides and hidden entities.
- Local validation with TypeScript, ESLint, Vitest, Vite, HACS compatibility,
  license checks and Chromium render smoke.
- Live Home Assistant smoke with install/uninstall support.
- Release notes, license notices, trademark hygiene and release metadata checks.

### Notes

- Built with Codex.
