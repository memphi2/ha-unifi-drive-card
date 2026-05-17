# Legal And Compliance Notes

This file is a repository hygiene note, not legal advice.

## License

The card source code is MIT licensed. Runtime Lit notices are kept in
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Trademarks

Home Assistant, HACS, Mushroom, UniFi and Ubiquiti are third-party names. This
project uses those names descriptively for compatibility only and is not
affiliated with, sponsored by or endorsed by those projects or companies.

The user-facing project name is `Drive Storage Card` to avoid presenting a
third-party mark as this project's own brand. Technical identifiers such as
`ha-unifi-drive-card`, `unifi-drive-card` and `unifi_drive` are retained for
repository, HACS and Home Assistant compatibility.

The repository does not include Ubiquiti, UniFi, Home Assistant or HACS logos,
brand images, screenshots from vendor websites, copied vendor UI, proprietary
type styles or vendor trade dress. Screenshots generated for this repository use
synthetic Home Assistant state data.

Reviewed reference points:

- Ubiquiti trademark guidance: use must be accurate, truthful and not imply
  sponsorship, affiliation or endorsement.
- Ubiquiti trademark guidance: product names and logos should not be copied,
  altered or used as the visual focal point of project materials.
- Home Assistant terms: Home Assistant names and logos remain Home Assistant or
  licensor intellectual property and no trademark license is granted by use of
  the website.

## Assets

| Asset | Source | Note |
| --- | --- | --- |
| `assets/screenshot-card.png` | Screenshot of this card UI. | Generated from synthetic data; should be regenerated if UI changes. |

## Security Hygiene

- Do not commit Home Assistant credentials, tokens, cookies or refresh tokens.
- Do not commit private hostnames, internal IP addresses or screenshots with private data.
- Use environment variables for live smoke tests.
- Keep dangerous actions hidden by default in examples and docs.

## Built With Codex

The initial implementation was built with Codex and reviewed through local
type, lint, unit, build, compatibility, license and browser smoke checks.
