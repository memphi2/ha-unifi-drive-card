# Legal And Compliance Notes

This file is a repository hygiene note, not legal advice.

## License

The card source code is MIT licensed. Runtime Lit notices are kept in
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Trademarks

Home Assistant, HACS, Mushroom, UniFi and Ubiquiti are third-party names. This
project uses those names descriptively for compatibility and is not affiliated
with, sponsored by or endorsed by those projects or companies.

## Assets

| Asset | Source | Note |
| --- | --- | --- |
| `assets/readme-banner.svg` | Project-authored SVG. | Does not embed official logos. |
| `assets/screenshot-card.png` | Screenshot of this card UI. | Should be regenerated with private data removed before release. |

## Security Hygiene

- Do not commit Home Assistant credentials, tokens, cookies or refresh tokens.
- Do not commit private hostnames, internal IP addresses or screenshots with private data.
- Use environment variables for live smoke tests.
- Keep dangerous actions hidden by default in examples and docs.

## Built With Codex

The initial implementation was built with Codex and reviewed through local
type, lint, unit, build, compatibility, license and browser smoke checks.
