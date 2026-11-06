# Security Policy

## Reporting

Report suspected vulnerabilities using
[GitHub private vulnerability reporting](https://github.com/memphi2/ha-unifi-drive-card/security/advisories/new).
Include the card version, reproduction steps and expected impact. Use synthetic
data and remove tokens, private addresses and personal details from attachments.
Ordinary bugs belong in the repository issue tracker.

## Scope

This frontend module runs with the permissions of the signed-in Home Assistant
user. It delegates device operations to Home Assistant and the `unifi_unas`
integration. Confirmations on dangerous actions prevent accidental clicks; they
do not replace backend authorization. Live smoke-test credentials belong in
environment variables and must never be committed.

## Maintenance

Use the latest stable card release. The current development baseline supports
Home Assistant 2026.4 or newer and tests original 2026.4 and 2026.11 frontend
components. These browser tests use synthetic registry/API data and do not prove
live-device security or backend permissions.

CI audits all locked npm dependencies, including build and test tools. Routine
npm and GitHub Actions updates are grouped quarterly. Security updates use
separate Dependabot groups and require the repository's automated security
updates setting to remain enabled. CodeQL runs on pull requests, main pushes
and a weekly schedule.

Workflow actions are pinned to full commit IDs. Build jobs use read-only tokens
and do not persist checkout credentials. The release publication job receives
write permission only after validation and downloads the same run's checked
artifact; it does not run npm or repository scripts.
