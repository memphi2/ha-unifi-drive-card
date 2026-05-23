# Installation

## Prerequisites

- Home Assistant with dashboards enabled.
- The `unifi_unas` integration is installed and exposes entities.
- Browser cache can be refreshed after updates.

## HACS

1. Add this repository as a HACS custom repository.
2. Select the dashboard/Lovelace category.
3. Install `Drive Storage Card`.
4. Reload the Home Assistant dashboard.

Resource URL:

```yaml
url: /hacsfiles/ha-unifi-drive-card/ha-unifi-drive-card.js
type: module
```

## Manual

```bash
npm ci
npm run build
```

Copy these generated files to `config/www/community/ha-unifi-drive-card/`:

```text
dist/ha-unifi-drive-card.js
dist/ha-unifi-drive-card.js.map
```

Manual resource URL:

```yaml
url: /local/community/ha-unifi-drive-card/ha-unifi-drive-card.js
type: module
```

## Install And Uninstall Smoke

Use environment variables only:

```bash
HA_TEST_URL=http://<ha-host>:8123 \
HA_TEST_USERNAME='<user>' \
HA_TEST_PASSWORD='<password>' \
HA_CARD_DEPLOY_DIR=/path/to/ha/config/www/community/ha-unifi-drive-card \
HA_CARD_CONFIG_DIR=/path/to/ha/config \
npm run smoke:install-uninstall
```

The smoke deploys the bundle, registers the Lovelace resource, validates UniFi
Drive entities, removes the resource and deletes the deployed bundle files.
