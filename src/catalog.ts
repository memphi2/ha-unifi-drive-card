import type { EntityDefinition, EntityKey, SectionId } from "./types";

export const DEFAULT_SECTIONS: SectionId[] = [
  "overview",
  "storage",
  "pools",
  "drives",
  "snapshots",
  "system",
  "updates",
  "diagnostics",
  "actions",
];

export const FALLBACK_ENTITY_DEFINITION: EntityDefinition = {
  key: "unknown",
  domain: "sensor",
  section: "overview",
  label: "Unknown",
  icon: "mdi:help-circle-outline",
  order: 0,
};

export const STORAGE_KEYS = [
  "usage_percent",
  "used_storage",
  "available_storage",
  "total_storage",
  "read_throughput",
  "write_throughput",
  "average_disk_temperature",
  "at_risk_disk_count",
  "degraded_pool_count",
  "maintenance_pool_count",
];

export const SYSTEM_KEYS = [
  "fan_mode",
  "wake_on_lan",
  "system_status",
  "device_online",
  "system_ip",
  "system_uptime",
  "cpu_temperature",
  "reboot",
  "shutdown",
];

export const UPDATE_KEYS = ["unifi_os_update", "drive_update"];

export const DIAGNOSTIC_KEYS = [
  "pool_count",
  "unifi_os_version",
  "drive_version",
  "maintenance_active",
  "system_ip",
  "system_uptime",
  "cpu_temperature",
];

export const POOL_KEYS = [
  "pool_status",
  "pool_problem",
  "pool_usage_percent",
  "pool_capacity",
  "pool_used",
  "pool_available",
  "pool_raid_level",
  "pool_drive_count",
  "pool_at_risk_drive_count",
  "pool_average_drive_temperature",
  "pool_rebuild_progress",
  "pool_sync_progress",
  "pool_maintenance_active",
];

export const DRIVE_KEYS = [
  "drive_status",
  "drive_temperature",
  "drive_power_on_hours",
];

export const SNAPSHOT_KEYS = [
  "snapshot_enabled",
  "snapshot_inventory",
  "snapshot_limit",
  "snapshot_schedule",
  "snapshot_schedule_time",
  "snapshot_weekday",
  "snapshot_month_day",
  "snapshot_create",
];

const aggregateDefinitions: EntityDefinition[] = [
  sensor("read_throughput", "overview", "Read throughput", "mdi:download", 10),
  sensor("write_throughput", "overview", "Write throughput", "mdi:upload", 11),
  sensor("total_storage", "storage", "Total storage", "mdi:database", 20),
  sensor("used_storage", "storage", "Used storage", "mdi:database-arrow-up", 21),
  sensor("available_storage", "storage", "Available storage", "mdi:database-check", 22),
  sensor("usage_percent", "storage", "Storage usage", "mdi:chart-donut", 23),
  sensor("overall_status", "overview", "Storage status", "mdi:shield-check", 30),
  sensor("degraded_pool_count", "diagnostics", "Degraded pools", "mdi:alert", 31, true),
  sensor("maintenance_pool_count", "diagnostics", "Pools in maintenance", "mdi:wrench", 32, true),
  sensor("at_risk_disk_count", "diagnostics", "At-risk drives", "mdi:alert-circle", 33, true),
  sensor("average_disk_temperature", "storage", "Average drive temperature", "mdi:thermometer", 34),
  sensor("pool_count", "diagnostics", "Pool count", "mdi:database", 35, true),
  sensor("system_ip", "system", "System IP", "mdi:ethernet", 40, true),
  sensor("system_uptime", "system", "System uptime", "mdi:timer-outline", 41, true),
  sensor("unifi_os_version", "diagnostics", "UniFi OS version", "mdi:console", 42, true),
  sensor("drive_version", "diagnostics", "Drive version", "mdi:application-cog", 43, true),
  sensor("cpu_temperature", "system", "CPU temperature", "mdi:thermometer", 44, true),
  sensor("system_status", "overview", "System status", "mdi:check-network", 45),
  binary("device_online", "system", "Device connection", "mdi:lan-connect", 46, true),
  binary("storage_problem", "overview", "Storage problem", "mdi:alert-circle", 50),
  binary("maintenance_active", "diagnostics", "Maintenance active", "mdi:wrench", 51, true),
  select("fan_mode", "system", "Fan mode", "mdi:fan-auto", 60),
  button("wake_on_lan", "system", "Wake on LAN", "mdi:lan-connect", 70, true),
  button("reboot", "system", "Restart", "mdi:restart", 80, true, true),
  button("shutdown", "system", "Shut down", "mdi:power", 81, true, true),
  update("unifi_os_update", "updates", "UniFi OS update", "mdi:console", 90, ["unifi_os"]),
  update("drive_update", "updates", "Drive update", "mdi:application-cog", 91, ["drive"]),
];

const poolDefinitions: EntityDefinition[] = [
  sensor("pool_status", "pools", "Status", "mdi:shield-check", 100, false, "pool"),
  binary("pool_problem", "pools", "Problem", "mdi:alert-circle", 101, false, "pool"),
  sensor("pool_usage_percent", "pools", "Usage", "mdi:chart-donut", 102, false, "pool"),
  sensor("pool_capacity", "pools", "Capacity", "mdi:database", 103, false, "pool"),
  sensor("pool_used", "pools", "Used", "mdi:database-arrow-up", 104, false, "pool"),
  sensor("pool_available", "pools", "Available", "mdi:database-check", 105, false, "pool"),
  sensor("pool_raid_level", "pools", "RAID level", "mdi:harddisk", 106, false, "pool"),
  sensor("pool_drive_count", "pools", "Drive count", "mdi:harddisk", 107, false, "pool"),
  sensor("pool_at_risk_drive_count", "pools", "At-risk drives", "mdi:alert-circle", 108, false, "pool"),
  sensor("pool_average_drive_temperature", "pools", "Average drive temperature", "mdi:thermometer", 109, false, "pool"),
  sensor("pool_rebuild_progress", "pools", "Rebuild progress", "mdi:wrench", 110, false, "pool"),
  sensor("pool_sync_progress", "pools", "Sync progress", "mdi:sync", 111, false, "pool"),
  binary("pool_maintenance_active", "pools", "Maintenance active", "mdi:wrench", 112, false, "pool"),
];

const driveDefinitions: EntityDefinition[] = [
  sensor("drive_status", "drives", "Status", "mdi:check-circle", 200, false, "drive"),
  sensor("drive_temperature", "drives", "Temperature", "mdi:thermometer", 201, false, "drive"),
  sensor("drive_power_on_hours", "drives", "Power-on hours", "mdi:clock-outline", 202, false, "drive"),
];

const snapshotDefinitions: EntityDefinition[] = [
  sw("snapshot_enabled", "snapshots", "Snapshots", "mdi:camera-switch", 300, true, "snapshot"),
  sensor("snapshot_inventory", "snapshots", "Snapshot inventory", "mdi:camera-burst", 301, true, "snapshot"),
  number("snapshot_limit", "snapshots", "Snapshot limit", "mdi:counter", 302, true, "snapshot"),
  select("snapshot_schedule", "snapshots", "Snapshot schedule", "mdi:calendar-clock", 303, true, "snapshot"),
  time("snapshot_schedule_time", "snapshots", "Schedule time", "mdi:clock-outline", 304, true, "snapshot"),
  select("snapshot_weekday", "snapshots", "Snapshot weekday", "mdi:calendar-week", 305, true, "snapshot"),
  number("snapshot_month_day", "snapshots", "Snapshot month day", "mdi:calendar-month", 306, true, "snapshot"),
  button("snapshot_create", "snapshots", "Create snapshot", "mdi:camera", 307, true, false, "snapshot"),
];

const backupDefinitions: EntityDefinition[] = [
  button("backup_run", "actions", "Run backup", "mdi:cloud-upload", 400, true, false, "backup"),
];

export const ENTITY_DEFINITIONS: EntityDefinition[] = [
  ...aggregateDefinitions,
  ...poolDefinitions,
  ...driveDefinitions,
  ...snapshotDefinitions,
  ...backupDefinitions,
].sort((left, right) => left.order - right.order);

export const ENTITY_DEFINITION_BY_KEY = Object.fromEntries(
  ENTITY_DEFINITIONS.map((definition) => [definition.key, definition]),
) as Record<EntityKey, EntityDefinition>;

export const STATIC_ENTITY_DEFINITIONS = ENTITY_DEFINITIONS.filter(
  (definition) => !definition.dynamic,
);

export const DYNAMIC_ENTITY_DEFINITIONS = ENTITY_DEFINITIONS.filter(
  (definition) => definition.dynamic,
);

export const ENTITY_DEFINITIONS_BY_SECTION = Object.fromEntries(
  DEFAULT_SECTIONS.map((section) => [section, [] as EntityDefinition[]]),
) as Record<SectionId, EntityDefinition[]>;

for (const definition of ENTITY_DEFINITIONS) {
  ENTITY_DEFINITIONS_BY_SECTION[definition.section].push(definition);
}

function sensor(
  key: EntityKey,
  section: SectionId,
  label: string,
  icon: string,
  order: number,
  diagnostic = false,
  dynamic?: EntityDefinition["dynamic"],
  aliases: string[] = [],
): EntityDefinition {
  return {
    key,
    domain: "sensor",
    section,
    label,
    icon,
    optional: dynamic !== undefined || diagnostic,
    diagnostic,
    dynamic,
    aliases,
    order,
  };
}

function binary(
  key: EntityKey,
  section: SectionId,
  label: string,
  icon: string,
  order: number,
  diagnostic = false,
  dynamic?: EntityDefinition["dynamic"],
): EntityDefinition {
  return {
    key,
    domain: "binary_sensor",
    section,
    label,
    icon,
    optional: dynamic !== undefined || diagnostic,
    diagnostic,
    dynamic,
    order,
  };
}

function button(
  key: EntityKey,
  section: SectionId,
  label: string,
  icon: string,
  order: number,
  optional = false,
  dangerous = false,
  dynamic?: EntityDefinition["dynamic"],
): EntityDefinition {
  return { key, domain: "button", section, label, icon, optional, dangerous, dynamic, order };
}

function number(
  key: EntityKey,
  section: SectionId,
  label: string,
  icon: string,
  order: number,
  optional = false,
  dynamic?: EntityDefinition["dynamic"],
): EntityDefinition {
  return { key, domain: "number", section, label, icon, optional, dynamic, order };
}

function select(
  key: EntityKey,
  section: SectionId,
  label: string,
  icon: string,
  order: number,
  optional = false,
  dynamic?: EntityDefinition["dynamic"],
): EntityDefinition {
  return { key, domain: "select", section, label, icon, optional, dynamic, order };
}

function sw(
  key: EntityKey,
  section: SectionId,
  label: string,
  icon: string,
  order: number,
  optional = false,
  dynamic?: EntityDefinition["dynamic"],
): EntityDefinition {
  return { key, domain: "switch", section, label, icon, optional, dynamic, order };
}

function time(
  key: EntityKey,
  section: SectionId,
  label: string,
  icon: string,
  order: number,
  optional = false,
  dynamic?: EntityDefinition["dynamic"],
): EntityDefinition {
  return { key, domain: "time", section, label, icon, optional, dynamic, order };
}

function update(
  key: EntityKey,
  section: SectionId,
  label: string,
  icon: string,
  order: number,
  aliases: string[] = [],
): EntityDefinition {
  return { key, domain: "update", section, label, icon, optional: true, aliases, order };
}
