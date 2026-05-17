# Development And Smoke Tests

## Tooling

- Node.js 22
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
npm run check
npm run render-smoke
```

`npm run check` runs type checking, linting, unit tests, production build, HACS
compatibility, license notice validation and anonymization checks.

`npm run render-smoke` builds the bundle and verifies in Chromium that the card
renders, groups dynamic UniFi Drive entities, hides dangerous actions by default
and dispatches tap, double-tap and hold actions.

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
| `src/actions.ts` | Home Assistant service helpers. |
| `src/display-text.ts` | Label and state cleanup. |
| `scripts/render_smoke.mjs` | Browser smoke. |
| `scripts/ha_card_smoke.mjs` | Live HA smoke and install/uninstall helper. |
| `scripts/anonymization_check.mjs` | Guards committed text files against private LAN addresses and literal secrets. |

## Review Checklist

- No secrets, private URLs or private IPs in committed files.
- New UI behavior has Vitest coverage.
- User-facing changes are documented.
- `npm run check` and `npm run render-smoke` pass before opening a PR.
