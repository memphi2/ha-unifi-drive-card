# Releasing

Releases are produced by GitHub Actions, not from unvalidated local builds.

## Preflight

```bash
npm run check
npm run render-smoke
```

Optional live validation:

```bash
HA_TEST_URL=http://<ha-host>:8123 \
HA_TEST_USERNAME='<user>' \
HA_TEST_PASSWORD='<password>' \
HA_CARD_DEPLOY_DIR=/path/to/ha/config/www/community/ha-unifi-drive-card \
HA_CARD_CONFIG_DIR=/path/to/ha/config \
npm run smoke:install-uninstall
```

## Publish

After `main` is green and release notes are current:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow runs validation, packages `ha-unifi-drive-card.js`,
`ha-unifi-drive-card.js.map` and `ha-unifi-drive-card.zip`, then publishes the
GitHub release for tag-triggered runs.
