# Releasing

Releases are produced by GitHub Actions, not from unvalidated local builds.

## Preflight

```bash
npm run check
npm run render-smoke
```

`npm run check` includes the 0.1.0 release metadata gate:

- `package.json` and `package-lock.json` version `0.1.0`
- HACS filename and trademark-neutral display name
- tag-specific release notes at `release-notes/v0.1.0.md`
- MIT license metadata and bundled Lit runtime notices
- legal/trademark disclaimer coverage
- release workflow upload list for JS, sourcemap and ZIP assets

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

After `main` is green, release notes are current and the release owner has
approved publication:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow runs validation, packages `ha-unifi-drive-card.js`,
`ha-unifi-drive-card.js.map` and `ha-unifi-drive-card.zip`, then publishes the
GitHub release for tag-triggered runs. Do not create or push this tag during
release-prep-only work.

## Compliance Checklist

- The project is MIT licensed.
- `THIRD_PARTY_NOTICES.md` contains bundled Lit runtime notices.
- Third-party marks are used only descriptively for compatibility.
- No Ubiquiti, UniFi, Home Assistant or HACS logos, vendor screenshots,
  proprietary UI, type styles or trade dress are bundled.
- Public reports and screenshots must not include private hostnames, LAN IPs,
  tokens, passwords or account identifiers.
