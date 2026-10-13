import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/config";
import { discoverEntities } from "../src/discovery";
import type { EntityDomain, EntityKey, HassEntity, HomeAssistant } from "../src/types";
import { INTEGRATION_DOMAIN } from "../src/types";

const STATIC_ENTITIES: ReadonlyArray<readonly [EntityDomain, string, EntityKey]> = [
  ["sensor", "read_throughput", "read_throughput"],
  ["sensor", "write_throughput", "write_throughput"],
  ["sensor", "total_storage", "total_storage"],
  ["sensor", "used_storage", "used_storage"],
  ["sensor", "available_storage", "available_storage"],
  ["sensor", "usage_percent", "usage_percent"],
  ["sensor", "overall_status", "overall_status"],
  ["sensor", "degraded_pool_count", "degraded_pool_count"],
  ["sensor", "maintenance_pool_count", "maintenance_pool_count"],
  ["sensor", "at_risk_disk_count", "at_risk_disk_count"],
  ["sensor", "average_disk_temperature", "average_disk_temperature"],
  ["sensor", "pool_count", "pool_count"],
  ["sensor", "system_ip", "system_ip"],
  ["sensor", "system_uptime", "system_uptime"],
  ["sensor", "unifi_os_version", "unifi_os_version"],
  ["sensor", "drive_version", "drive_version"],
  ["sensor", "cpu_temperature", "cpu_temperature"],
  ["sensor", "system_status", "system_status"],
  ["binary_sensor", "device_online", "device_online"],
  ["binary_sensor", "storage_problem", "storage_problem"],
  ["binary_sensor", "maintenance_active", "maintenance_active"],
  ["select", "fan_mode", "fan_mode"],
  ["button", "wake_on_lan", "wake_on_lan"],
  ["button", "restart", "reboot"],
  ["button", "shutdown", "shutdown"],
  ["update", "unifi_os", "unifi_os_update"],
  ["update", "drive", "drive_update"],
];

const POOL_ENTITIES: ReadonlyArray<readonly [EntityDomain, EntityKey]> = [
  ["sensor", "pool_status"],
  ["binary_sensor", "pool_problem"],
  ["sensor", "pool_usage_percent"],
  ["sensor", "pool_capacity"],
  ["sensor", "pool_used"],
  ["sensor", "pool_available"],
  ["sensor", "pool_raid_level"],
  ["sensor", "pool_drive_count"],
  ["sensor", "pool_at_risk_drive_count"],
  ["sensor", "pool_average_drive_temperature"],
  ["sensor", "pool_rebuild_progress"],
  ["sensor", "pool_sync_progress"],
  ["binary_sensor", "pool_maintenance_active"],
];

const DRIVE_ENTITIES: ReadonlyArray<readonly [EntityDomain, EntityKey]> = [
  ["sensor", "drive_status"],
  ["sensor", "drive_temperature"],
  ["sensor", "drive_power_on_hours"],
];

const SNAPSHOT_ENTITIES: ReadonlyArray<readonly [EntityDomain, EntityKey]> = [
  ["switch", "snapshot_enabled"],
  ["sensor", "snapshot_inventory"],
  ["number", "snapshot_limit"],
  ["select", "snapshot_schedule"],
  ["time", "snapshot_schedule_time"],
  ["select", "snapshot_weekday"],
  ["number", "snapshot_month_day"],
  ["button", "snapshot_create"],
];

describe("current unifi_unas entity contract", () => {
  it("discovers every entity exposed by the integration", () => {
    const hass = integrationFixture();
    const discovered = discoverEntities(hass, normalizeConfig({ device_id: "device-a" }));

    for (const [, , cardKey] of STATIC_ENTITIES) {
      expect(discovered.entityIds[cardKey]).toBe(entityId(cardKey));
    }
    expect(discovered.groups.pool[0]?.entityIds).toMatchObject(
      Object.fromEntries(POOL_ENTITIES.map(([, key]) => [key, entityId(key)])),
    );
    expect(discovered.groups.drive[0]?.entityIds).toMatchObject(
      Object.fromEntries(DRIVE_ENTITIES.map(([, key]) => [key, entityId(key)])),
    );
    expect(discovered.groups.snapshot[0]?.entityIds).toMatchObject(
      Object.fromEntries(SNAPSHOT_ENTITIES.map(([, key]) => [key, entityId(key)])),
    );
    expect(discovered.groups.backup[0]).toMatchObject({
      id: "backup-1",
      name: "Offsite backup",
      entityIds: { backup_run: entityId("backup_run") },
    });
  });
});

function integrationFixture(): HomeAssistant {
  const states: Record<string, HassEntity> = {};
  const entities: NonNullable<HomeAssistant["entities"]> = {};
  const add = (
    domain: EntityDomain,
    translationKey: string,
    cardKey: EntityKey,
    attributes: Record<string, unknown> = {},
  ) => {
    const id = entityId(cardKey);
    states[id] = { state: "on", attributes };
    entities[id] = {
      config_entry_id: "entry-a",
      device_id: "device-a",
      platform: INTEGRATION_DOMAIN,
      translation_key: translationKey,
      unique_id: `entry_${domain}_${cardKey}`,
    };
  };

  for (const [domain, translationKey, cardKey] of STATIC_ENTITIES) {
    add(domain, translationKey, cardKey);
  }
  for (const [domain, key] of POOL_ENTITIES) {
    add(domain, key, key, { pool_key: "pool-1", pool_name: "Primary pool" });
  }
  for (const [domain, key] of DRIVE_ENTITIES) {
    add(domain, key, key, { drive_key: "drive-1", drive_name: "Drive 1" });
  }
  for (const [domain, key] of SNAPSHOT_ENTITIES) {
    add(domain, key, key, {
      target_key: "shared-1",
      target_name: "Shared data",
      target_type: "shared",
    });
  }
  add("button", "backup_task", "backup_run", {
    task_id: "backup-1",
    task_name: "Offsite backup",
  });

  return { states, entities, callService: async () => undefined };
}

function entityId(key: EntityKey): string {
  const domain =
    STATIC_ENTITIES.find(([, , cardKey]) => cardKey === key)?.[0] ??
    POOL_ENTITIES.find(([, cardKey]) => cardKey === key)?.[0] ??
    DRIVE_ENTITIES.find(([, cardKey]) => cardKey === key)?.[0] ??
    SNAPSHOT_ENTITIES.find(([, cardKey]) => cardKey === key)?.[0] ??
    "button";
  return `${domain}.contract_${key}`;
}
