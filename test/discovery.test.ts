import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/config";
import { discoverEntities } from "../src/discovery";
import type { HomeAssistant } from "../src/types";
import { INTEGRATION_DOMAIN } from "../src/types";

describe("discoverEntities", () => {
  it("discovers aggregate entities by registry metadata", () => {
    const hass: HomeAssistant = {
      states: {
        "sensor.unas_system_status": state("online"),
        "sensor.unas_usage": state("42"),
        "binary_sensor.unas_storage_problem": state("off"),
        "binary_sensor.unas_device_connection": state("on"),
      },
      entities: {
        "sensor.unas_system_status": registry("dev-a", "system_status"),
        "sensor.unas_usage": registry("dev-a", "usage_percent"),
        "binary_sensor.unas_storage_problem": registry("dev-a", "storage_problem"),
        "binary_sensor.unas_device_connection": registry("dev-a", "device_online"),
      },
      callService: async () => undefined,
    };

    const discovered = discoverEntities(hass, normalizeConfig({}));

    expect(discovered.baseEntity).toBe("sensor.unas_system_status");
    expect(discovered.entityIds.system_status).toBe("sensor.unas_system_status");
    expect(discovered.entityIds.usage_percent).toBe("sensor.unas_usage");
    expect(discovered.entityIds.storage_problem).toBe("binary_sensor.unas_storage_problem");
    expect(discovered.entityIds.device_online).toBe("binary_sensor.unas_device_connection");
    expect(discovered.deviceId).toBe("dev-a");
    expect(discovered.configEntryId).toBe("entry-a");
  });

  it("groups pool, drive, snapshot and backup entities from attributes", () => {
    const hass: HomeAssistant = {
      states: {
        "sensor.pool_status": entity("healthy", {
          friendly_name: "UniFi Drive Pool 1 Status",
          pool_key: "pool-1",
          pool_name: "Pool 1",
        }),
        "sensor.drive_temperature": entity("31", {
          drive_key: "pool-1_sda",
          drive_name: "Disk 1",
        }),
        "switch.snapshots": entity("on", {
          target_key: "shared_main",
          target_name: "Shared",
          target_type: "shared",
        }),
        "button.backup": entity("unknown", {
          task_id: "task-1",
          task_name: "Remote backup",
        }),
      },
      entities: {
        "sensor.pool_status": registry("dev-a", "pool_status"),
        "sensor.drive_temperature": registry("dev-a", "drive_temperature"),
        "switch.snapshots": registry("dev-a", "snapshot_enabled"),
        "button.backup": registry("dev-a", undefined, "dev-a_backup_task-1"),
      },
      callService: async () => undefined,
    };

    const discovered = discoverEntities(hass, normalizeConfig({ device_id: "dev-a" }));

    expect(discovered.groups.pool[0]).toMatchObject({
      id: "pool-1",
      name: "Pool 1",
      entityIds: { pool_status: "sensor.pool_status" },
    });
    expect(discovered.groups.drive[0]).toMatchObject({
      id: "pool-1_sda",
      name: "Disk 1",
      entityIds: { drive_temperature: "sensor.drive_temperature" },
    });
    expect(discovered.groups.snapshot[0]).toMatchObject({
      id: "shared_main",
      name: "Shared",
      type: "shared",
      entityIds: { snapshot_enabled: "switch.snapshots" },
    });
    expect(discovered.groups.backup[0]).toMatchObject({
      id: "task-1",
      name: "Remote backup",
      entityIds: { backup_run: "button.backup" },
    });
  });

  it("discovers snapshot entities without target attributes", () => {
    const hass: HomeAssistant = {
      states: {
        "switch.snapshots": entity("on", {
          friendly_name: "UniFi Drive Snapshots",
        }),
      },
      entities: {
        "switch.snapshots": registry("dev-a", "snapshot_enabled"),
      },
      callService: async () => undefined,
    };

    const discovered = discoverEntities(hass, normalizeConfig({ device_id: "dev-a" }));

    expect(discovered.groups.snapshot).toHaveLength(1);
    expect(discovered.groups.snapshot[0]).toMatchObject({
      id: "snapshots",
      entityIds: { snapshot_enabled: "switch.snapshots" },
    });
  });

  it("does not classify generic drive status aliases as pool status", () => {
    const hass: HomeAssistant = {
      states: {
        "sensor.disk_1_status": entity("healthy", {
          friendly_name: "Disk 1 Status",
        }),
        "sensor.pool_1_status": entity("healthy", {
          friendly_name: "Pool 1 Status",
        }),
      },
      entities: {
        "sensor.disk_1_status": registry(
          "dev-a",
          "drive_status",
          "unifi_unas_entry_drive_disk-1_status",
        ),
        "sensor.pool_1_status": registry(
          "dev-a",
          "pool_status",
          "unifi_unas_entry_pool_pool-1_status",
        ),
      },
      callService: async () => undefined,
    };

    const discovered = discoverEntities(hass, normalizeConfig({ device_id: "dev-a" }));

    expect(discovered.groups.drive).toHaveLength(1);
    expect(discovered.groups.drive[0]).toMatchObject({
      id: "disk-1",
      entityIds: { drive_status: "sensor.disk_1_status" },
    });
    expect(discovered.groups.pool).toHaveLength(1);
    expect(discovered.groups.pool[0]).toMatchObject({
      id: "pool-1",
      entityIds: { pool_status: "sensor.pool_1_status" },
    });
  });

  it("does not discover entities without integration registry metadata", () => {
    const hass: HomeAssistant = {
      states: {
        "sensor.unas_system_status": entity("online", {
          friendly_name: "UNAS System Status",
        }),
        "sensor.unas_usage": entity("42", {
          friendly_name: "UNAS Storage Usage",
        }),
      },
      callService: async () => undefined,
    };

    const discovered = discoverEntities(hass, normalizeConfig({}));

    expect(discovered.baseEntity).toBeUndefined();
    expect(discovered.entityIds).toEqual({});
  });

  it("does not match dynamic aliases inside larger slug tokens", () => {
    const hass: HomeAssistant = {
      states: {
        "sensor.pool_unused_space": entity("123", {
          friendly_name: "Pool 1 Unused Space",
          pool_key: "pool-1",
          pool_name: "Pool 1",
        }),
      },
      entities: {
        "sensor.pool_unused_space": registry(
          "dev-a",
          undefined,
          "unifi_unas_entry_pool_pool-1_unused_space",
        ),
      },
      callService: async () => undefined,
    };

    const discovered = discoverEntities(hass, normalizeConfig({ device_id: "dev-a" }));

    expect(discovered.groups.pool).toHaveLength(0);
  });

  it("honors explicit overrides before discovery", () => {
    const hass: HomeAssistant = {
      states: {
        "sensor.custom_usage": state("55"),
      },
      callService: async () => undefined,
    };

    const discovered = discoverEntities(
      hass,
      normalizeConfig({ entities: { usage_percent: "sensor.custom_usage" } }),
    );

    expect(discovered.entityIds.usage_percent).toBe("sensor.custom_usage");
  });
});

function state(value: string) {
  return entity(value, {});
}

function entity(value: string, attributes: Record<string, unknown>) {
  return { state: value, attributes };
}

function registry(deviceId: string, translationKey?: string, uniqueId?: string) {
  return {
    config_entry_id: "entry-a",
    device_id: deviceId,
    platform: INTEGRATION_DOMAIN,
    translation_key: translationKey,
    unique_id: uniqueId ?? `${INTEGRATION_DOMAIN}_entry_${translationKey}`,
  };
}
