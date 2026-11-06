# Development And Smoke Tests

## Tooling

- Node.js 26 LTS for development, CI and release builds (`nvm use`).
- Supported Node lines: 22.22.2+, 24.15.0+ and 26.x; odd majors are excluded.
- npm
- TypeScript
- ESLint
- Vitest
- Vite
- Chrome or Chromium for render smoke tests

```bash
npm ci
```

## Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run compat
npm run license-check
npm run anonymization-check
npm run anonymization-check:github
npm run release-check
npm run security-audit
npm run check
npm run render-smoke
npm run ha:components-smoke
```

`npm run check` runs type checking, linting, unit tests, production build, HACS
compatibility, license notice validation, anonymization checks, release metadata
validation and a locked dependency audit covering runtime and development tools.

`npm run render-smoke` builds the bundle and verifies in Chromium that the card
renders, groups dynamic UniFi Drive entities, hides dangerous actions by
default, validates overview tile columns, flows from a narrow dashboard column
into a reordered wide horizontal layout, and dispatches tap, double-tap and hold
actions.

`npm run ha:components-smoke` loads the original HA 2026.4.0 frontend
(`20260325.5`) and HA 2026.11.0 frontend (`20261028.4`) from SHA-256-pinned
PyPI wheels. Pass `-- minimum` or `-- current` to run a single baseline.
It renders the card and its
visual editor against original HA components and types a name through the real
text selector, then toggles compact mode off and on using the real switch.
Registry, context and API data are synthetic. This checks frontend
compatibility; it does not test a live HA backend, device services, or a Marketplace
installation. The `hacs.json` minimum is tied to the tested 2026.4.0 baseline.

If Chromium reports `Disk quota exceeded` for its temporary profile, select a
writable temporary filesystem, for example `TMPDIR=/var/tmp npm run render-smoke`.
The test does not retry or suppress browser errors.

CI and release automation run the original-component test and the synthetic
render smoke. Releases also validate storage fixtures and compare the ZIP
members byte-for-byte with the generated bundle and source map using
`npm run release-archive-check -- release/ha-unifi-drive-card.zip`.
The unit-check job runs on Node 22, 24 and 26. CodeQL analyzes JavaScript and
TypeScript on pull requests, main pushes and a weekly schedule.

`npm run deprecation-check` rejects packages marked as deprecated in the lockfile.
It runs as part of `npm run check`; refresh dependencies regularly because registry
deprecations added after lockfile generation are not recorded in that file.

`npm run anonymization-check:github` scans GitHub release bodies, issue/PR
titles and bodies, comments, and recent commit messages for private LAN IPs and
literal secret patterns. It requires `GH_REPO` and `GITHUB_TOKEN` (or
`GH_TOKEN`) when run in required mode.

## Live Home Assistant Smoke

Credentials and paths must stay in environment variables:

```bash
HA_TEST_URL=http://<ha-host>:8123 \
HA_TEST_USERNAME='<user>' \
HA_TEST_PASSWORD='<password>' \
npm run smoke
```

Install/uninstall smoke:

```bash
HA_TEST_URL=http://<ha-host>:8123 \
HA_TEST_USERNAME='<user>' \
HA_TEST_PASSWORD='<password>' \
HA_CARD_DEPLOY_DIR=/path/to/ha/config/www/community/ha-unifi-drive-card \
HA_CARD_CONFIG_DIR=/path/to/ha/config \
npm run smoke:install-uninstall
```

## Code Map

| Path | Purpose |
| --- | --- |
| `src/unifi-drive-card.ts` | Main Lit card and controls. |
| `src/editor.ts` | Visual card editor. |
| `src/catalog.ts` | Sections and entity definitions. |
| `src/discovery.ts` | Entity discovery and dynamic grouping. |
| `src/editor-actions.ts` | Visual editor action conversion, service targets and service data parsing. |
| `src/entity-groups.ts` | Section-specific dynamic entity groups. |
| `src/rendering.ts` | Shared Lit renderability helpers. |
| `src/actions.ts` | Home Assistant service helpers. |
| `src/display-text.ts` | Label and state cleanup. |
| `scripts/render_smoke.mjs` | Browser smoke. |
| `scripts/ha_card_smoke.mjs` | Live HA smoke and install/uninstall helper. |
| `scripts/anonymization_check.mjs` | Guards committed text files against private LAN addresses and literal secrets. |
| `scripts/anonymization_check_github.mjs` | Scans GitHub release/issues/PR/comment surfaces for private LAN addresses and secret-like literals. |
| `scripts/release_check.mjs` | Validates release metadata, notes and compliance gates. |

## Review Checklist

- No secrets, private URLs or private IPs in committed files.
- New UI behavior has Vitest coverage.
- User-facing changes are documented.
- `npm run check` and `npm run render-smoke` pass before opening a PR.
