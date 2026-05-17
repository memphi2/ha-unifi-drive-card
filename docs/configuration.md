# Configuration

The card works from YAML or the Home Assistant visual editor.

## Minimal

```yaml
type: custom:unifi-drive-card
```

For multiple UniFi Drive devices, set either `entity` or `device_id`:

```yaml
type: custom:unifi-drive-card
entity: sensor.unifi_drive_system_status
```

## Full Example

```yaml
type: custom:unifi-drive-card
name: UniFi Drive
compact: true
show_unavailable: false
show_optional: false
show_diagnostics: true
show_dangerous_actions: false
show_icon_animations: true
max_sensor_rows: 10
sections:
  - overview
  - storage
  - pools
  - drives
  - snapshots
  - system
  - updates
  - diagnostics
  - actions
hide_entities:
  - shutdown
entities:
  usage_percent: sensor.custom_unas_usage
tap_action:
  action: more-info
hold_action:
  action: navigate
  navigation_path: /lovelace/unifi-drive
double_tap_action:
  action: toggle
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | string | required | Must be `custom:unifi-drive-card`. |
| `entity` | string | auto | Optional anchor entity for registry discovery. |
| `device_id` | string | auto | Restricts discovery to one Home Assistant device. |
| `name` | string | `UniFi Drive` | Card title. |
| `compact` | boolean | `true` | Reduces vertical spacing. Set to `false` for the roomier layout. |
| `show_unavailable` | boolean | `false` | Shows unavailable entities. |
| `show_optional` | boolean | `false` | Shows optional missing entities as placeholders. |
| `show_diagnostics` | boolean | `true` | Enables diagnostics. |
| `show_dangerous_actions` | boolean | `false` | Shows restart/shutdown actions with confirmation. |
| `show_icon_animations` | boolean | `true` | Enables animated icon states. |
| `max_sensor_rows` | number | `10` | Limits row-heavy sections. |
| `sections` | list | all | Ordered visible sections. |
| `hide_entities` | list | `[]` | Known entity keys to hide. |
| `entities` | map | `{}` | Entity ID overrides by key. |
| `tap_action` | action | `more-info` | Action fired on click. |
| `hold_action` | action | unset | Action fired on long press. |
| `double_tap_action` | action | unset | Action fired on double click. |

Service actions from the visual editor are written in Home Assistant's current
`perform-action` format. The editor also supports service target entity, area
and device fields plus JSON service data.

## Sections

| Section | Purpose |
| --- | --- |
| `overview` | Main status, storage usage and throughput. |
| `storage` | Aggregate storage capacity, usage, health and temperature. |
| `pools` | Dynamic per-pool status and capacity rows. |
| `drives` | Dynamic per-drive health, temperature and power-on hours. |
| `snapshots` | Dynamic snapshot target controls and inventory. |
| `system` | Fan mode, Wake-on-LAN and optional power actions. |
| `updates` | UniFi OS and Drive update entities. |
| `diagnostics` | Version, uptime and diagnostic counters. |
| `actions` | Dynamic backup task buttons. |

## Discovery

Discovery prefers Home Assistant registry metadata:

- platform `unifi_drive`
- enabled and visible registry entries
- same device as the anchor entity or `device_id`
- known translation keys and unique ID suffixes

Manual overrides always win:

```yaml
entities:
  fan_mode: select.custom_fan_mode
  usage_percent: sensor.custom_usage
```

Dynamic pools, drives, snapshots and backup tasks are grouped from entity
attributes such as `pool_key`, `drive_key`, `target_key` and `task_id`.
