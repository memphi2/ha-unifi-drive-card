# Installation

## Before You Start

- Home Assistant with dashboards enabled.
- The `unifi_unas` integration is installed and exposes entities.
- You can refresh browser cache after updates.

Quick pre-check in Home Assistant:

1. Open **Settings -> Devices & Services**.
2. Confirm the UniFi Drive/UNAS integration is loaded.
3. Confirm you see entities such as sensors, switches or updates.

If the integration is missing, install/fix that first. This card only renders
existing Home Assistant entities.

## Marketplace Or HACS

[![Open in Home Assistant Marketplace](https://my.home-assistant.io/badges/marketplace_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=memphi2&repository=ha-unifi-drive-card&category=plugin)

### Home Assistant 2026.11 Or Newer: Marketplace

Open the button above or go to **Settings > Marketplace**, search for
**Unifi Drive / UNAS Card**, and install it from the **Dashboard** category
(`plugin` in the catalog). Reload the browser after installation.

The Marketplace uses the existing `hacs.json` metadata and the JavaScript asset
from the latest release. It adds a module resource with a version query
parameter, so each update receives a new browser cache key. Existing HACS
repositories and `/hacsfiles/` resources carry over; do not add a duplicate
card resource.

Reference: [Marketplace dashboard packaging](https://contributors.home-assistant.io/marketplace/guides/dashboard/).

### Earlier Home Assistant Versions: HACS

1. Open HACS in Home Assistant.
2. Add this repository as a **Custom repository** in the **Dashboard** category.
3. Install `Unifi Drive / UNAS Card`.
4. Reload Home Assistant.
5. Open your dashboard, add a new card, and select `custom:unifi-drive-card`.

If your dashboard does not show the new card immediately, hard-refresh the page.

Resource URL:

```yaml
url: /hacsfiles/ha-unifi-drive-card/ha-unifi-drive-card.js
type: module
```

## Manual

Use this when you do not want HACS.

```bash
npm ci
npm run build
```

Copy these generated files to `config/www/community/ha-unifi-drive-card/`:

```text
dist/ha-unifi-drive-card.js
dist/ha-unifi-drive-card.js.map
```

Then reload Home Assistant and add the card in the dashboard editor.

Manual resource URL:

```yaml
url: /local/community/ha-unifi-drive-card/ha-unifi-drive-card.js
type: module
```

## First Card Setup

Minimal YAML:

```yaml
type: custom:unifi-drive-card
```

For multi-device installations, anchor discovery explicitly:

```yaml
type: custom:unifi-drive-card
device_id: your_home_assistant_device_id
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

Use this smoke when preparing a release or validating a clean install path.
