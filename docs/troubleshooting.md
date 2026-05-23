# Troubleshooting

## Quick Checklist

Before diving into details, check these first:

1. Resource URL is correct for your install method (HACS vs manual).
2. Browser cache was hard-refreshed after updates.
3. `unifi_unas` entities exist and are available in Home Assistant.
4. Card version and bundle file actually changed after deployment.

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

Then reload dashboard resources and hard-refresh the browser page.

## Missing Entities

The card skips disabled or hidden Home Assistant registry entities. Enable and
unhide the entity, then reload the dashboard. If discovery still picks the wrong
entity, set an override:

```yaml
entities:
  usage_percent: sensor.custom_usage
```

For multiple UniFi devices, set `device_id` so discovery is anchored to one
device.

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

If the error is action-specific, validate the same action from Developer Tools
in Home Assistant to isolate backend vs card issues.

## Old Version Still Appears

Hard reload the browser, reload dashboard resources, and verify that the bundle
file changed. During manual testing, append a temporary query string:

```yaml
url: /local/community/ha-unifi-drive-card/ha-unifi-drive-card.js?v=dev
type: module
```

Remove the query suffix after debugging.

## Layout Looks Wrong

The card layout follows dashboard column width. Resize the dashboard column to
trigger narrow vs wide layout modes.

If compact mode should be active:

```yaml
compact: true
```

## Reporting

Include the Home Assistant version, card version or commit, minimal YAML,
browser console errors and a screenshot with private data removed. Do not share
tokens, passwords, private hostnames or private IP addresses in public issues.
