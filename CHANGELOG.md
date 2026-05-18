# Changelog

## Unreleased

### Changed

- None pending.

## 0.1.1 - 2026-05-18

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
