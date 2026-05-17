# Troubleshooting

## Card Does Not Load

Check the browser console and resource URL first.

HACS:

```yaml
url: /hacsfiles/ha-unifi-drive-card/ha-unifi-drive-card.js
type: module
```

Manual:

```yaml
url: /local/community/ha-unifi-drive-card/ha-unifi-drive-card.js
type: module
```

## Missing Entities

The card skips disabled or hidden Home Assistant registry entities. Enable and
unhide the entity, then reload the dashboard. If discovery still picks the wrong
entity, set an override:

```yaml
entities:
  usage_percent: sensor.custom_usage
```

## Dangerous Actions Not Visible

Restart and shutdown are hidden by default.

```yaml
show_dangerous_actions: true
```

The card still asks for confirmation before running dangerous button entities.

## Service Call Fails

The card shows an inline error and emits a Home Assistant notification event.
Check that the backend integration has permission for the action, the entity is
available, and the UniFi account/API key supports the requested operation.

## Old Version Still Appears

Hard reload the browser, reload dashboard resources, and verify that the bundle
file changed. During manual testing, append a temporary query string:

```yaml
url: /local/community/ha-unifi-drive-card/ha-unifi-drive-card.js?v=dev
type: module
```

## Reporting

Include the Home Assistant version, card version or commit, minimal YAML,
browser console errors and a screenshot with private data removed. Do not share
tokens, passwords, private hostnames or private IP addresses in public issues.
