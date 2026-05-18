# Legal And Compliance Notes

This file is a repository hygiene note, not legal advice.

## Compliance Notice

This repository contains an independent Lovelace custom card. It distributes
frontend JavaScript and related project documentation only. It does not include,
modify, patch, redistribute or replace UniFi firmware, UniFi OS, Home Assistant,
HACS, Mushroom, vendor cloud services, vendor mobile applications, or any
proprietary vendor assets.

Users are responsible for complying with the terms that apply to their own Home
Assistant installation, HACS setup, UniFi hardware, UniFi OS installation,
network environment and jurisdiction. The project does not grant rights in any
third-party product, service, logo, mark, API, firmware, cloud account, hardware
or documentation.

Repository hygiene commitments:

- Use third-party names only when needed to describe compatibility.
- Keep the user-facing project name trademark-neutral: `Drive Storage Card`.
- Keep credentials, tokens, cookies, hostnames, internal IP addresses and private
  screenshots out of committed files.
- Use environment variables for live Home Assistant smoke tests.
- Keep dangerous actions hidden by default in examples and UI defaults.
- Keep release artifacts limited to this card's built JavaScript bundle,
  sourcemap and release ZIP.

## License

The card source code is MIT licensed. Runtime Lit notices are kept in
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Trademark Notice

UniFi and Ubiquiti are trademarks or registered trademarks of Ubiquiti Inc. or
its affiliates. Home Assistant, HACS and Mushroom are third-party names and may
be trademarks or project identifiers of their respective owners.

This project uses third-party names descriptively for compatibility only. It is
not affiliated with, sponsored by or endorsed by Ubiquiti, Home Assistant, HACS,
Mushroom or their respective owners and maintainers. No statement in this
repository should be read as an official certification, partnership, authorized
reseller status, support relationship or compatibility guarantee from any of
those parties.

The user-facing project name is `Drive Storage Card` to avoid presenting a
third-party mark as this project's own brand. Technical identifiers such as
`ha-unifi-drive-card`, `unifi-drive-card` and `unifi_drive` are retained for
repository, HACS and Home Assistant compatibility.

The repository does not include Ubiquiti, UniFi, Home Assistant or HACS logos,
brand images, screenshots from vendor websites, copied vendor UI, proprietary
type styles or vendor trade dress. Screenshots generated for this repository use
synthetic Home Assistant state data.

Trademark usage rules for this repository:

- Do not use Ubiquiti, UniFi, Home Assistant, HACS or Mushroom names as the
  user-facing project brand.
- Do not use third-party marks in a way that implies sponsorship, endorsement,
  official status, reseller status or affiliation.
- Do not copy, alter, animate or visually imitate third-party logos, product
  packaging, type styles, website layouts, marketing pages or UI trade dress.
- Do not register confusingly similar domains, package names or marks for this
  project.
- Keep third-party names visually secondary to the project name in public
  project materials.
- Keep compatibility statements truthful, narrow and tied to the actual tested
  Home Assistant custom-card behavior.

Reviewed reference points:

- [Ubiquiti Trademark Guidelines](https://dl.ubnt.com/compliance/Trademark_Guidelines_v2.pdf)
  permit descriptive references to Ubiquiti products but restrict usage that
  misleads users about sponsorship, affiliation or endorsement.
- [Ubiquiti Terms of Service](https://www.ui.com/legal/) state that Ubiquiti
  marks are owned by Ubiquiti or their respective holders and require applicable
  prior written consent for mark use outside permitted contexts.
- [Home Assistant brand image documentation](https://developers.home-assistant.io/docs/core/integration/brand_images/)
  describes how Home Assistant serves and manages integration logos and icons;
  this project does not bundle Home Assistant brand images.
- [Home Assistant logo announcement](https://www.home-assistant.io/blog/2023/09/17/a-refreshed-logo-for-home-assistant/)
  points users to Home Assistant's design repository for current logo assets and
  brand guidance; this project does not use those assets.

## Acknowledgements

This project acknowledges the following third-party projects and ecosystems:

- Home Assistant, for the dashboard and custom-card platform.
- HACS, for the custom repository distribution path many users rely on.
- Mushroom, for the compact card design vocabulary referenced by the project
  description. No Mushroom source code, logos or assets are bundled.
- Ubiquiti and the UniFi product ecosystem, for the compatible storage devices
  and Home Assistant entities this card can display.
- Lit and related runtime packages, whose license notices are retained in
  [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
- Codex, which was used to build and harden the initial implementation.

Acknowledgement does not imply endorsement, sponsorship, certification or
support by any third-party project, company or maintainer.

## Assets

| Asset | Source | Note |
| --- | --- | --- |
| `assets/screenshot*-card.png` | Screenshots of this card UI. | Generated from redacted or synthetic data; should be regenerated if UI changes. |

## Security Hygiene

- Do not commit Home Assistant credentials, tokens, cookies or refresh tokens.
- Do not commit private hostnames, internal IP addresses or screenshots with private data.
- Use environment variables for live smoke tests.
- Keep dangerous actions hidden by default in examples and docs.

## Built With Codex

The initial implementation was built with Codex and reviewed through local
type, lint, unit, build, compatibility, license and browser smoke checks.
