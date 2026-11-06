import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/config";
import { DiscoveryCache } from "../src/discovery-cache";
import type { HomeAssistant } from "../src/types";
import { INTEGRATION_DOMAIN } from "../src/types";

describe("DiscoveryCache", () => {
  it.each([
    ["pool", "sensor", "pool_status", "pool_key", "pool_name"],
    ["drive", "sensor", "drive_status", "drive_key", "drive_name"],
    ["snapshot", "switch", "snapshot_enabled", "target_key", "target_name"],
    ["backup", "button", "backup_task", "task_id", "task_name"],
  ] as const)("refreshes %s identity and labels from integration attributes", (kind, domain, key, idKey, nameKey) => {
    const cache = new DiscoveryCache();
    const config = normalizeConfig({ device_id: "device-a" });
    const entityId = `${domain}.group_fixture`;
    const fixture = (id: string, name: string): HomeAssistant => ({
      states: { [entityId]: entity("on", { [idKey]: id, [nameKey]: name }) },
      entities: { [entityId]: registry(key) },
      callService: async () => undefined,
    });
    cache.get(fixture("first", "First group"), config);
    const updated = cache.get(fixture("second", "Second group"), config);
    expect(updated.groups[kind]).toHaveLength(1);
    expect(updated.groups[kind][0]).toMatchObject({ id: "second", name: "Second group" });
  });

  it("invalidates when a pool is renamed without a friendly-name change", () => {
    const cache = new DiscoveryCache();
    const config = normalizeConfig({});
    const first = cache.get(hassFixture("Pool 1"), config);
    const second = cache.get(hassFixture("Pool 2"), config);
    expect(second).not.toBe(first);
    expect(second.groups.pool[0]?.name).toBe("Pool 2");
  });

  it("keeps discovery cached when only sensor readings change", () => {
    const cache = new DiscoveryCache();
    const config = normalizeConfig({});
    const initial = hassFixture();
    const first = cache.get(initial, config);
    const updated = { ...initial, states: { ...initial.states,
      "sensor.usage": entity("75", {}),
    } };
    expect(cache.get(updated, config)).toBe(first);
  });

  it("reuses discovery when equivalent HA snapshots arrive with new objects", () => {
    const cache = new DiscoveryCache();
    const first = cache.get(hassFixture(), normalizeConfig({}));
    const second = cache.get(hassFixture(), normalizeConfig({}));

    expect(second).toBe(first);
    expect(second.entityIds.usage_percent).toBe("sensor.usage");
  });

  it("invalidates when config or discovery attributes change", () => {
    const cache = new DiscoveryCache();
    const first = cache.get(hassFixture("Pool 1"), normalizeConfig({}));
    const hidden = cache.get(
      hassFixture("Pool 1"),
      normalizeConfig({ hide_entities: ["usage_percent"] }),
    );
    const renamed = cache.get(hassFixture("Pool 2"), normalizeConfig({}));

    expect(hidden).not.toBe(first);
    expect(hidden.entityIds.usage_percent).toBeUndefined();
    expect(renamed).not.toBe(hidden);
    expect(renamed.groups.pool[0]?.name).toBe("Pool 2");
  });
});

function hassFixture(poolName = "Pool 1"): HomeAssistant {
  return {
    states: {
      "sensor.system_status": entity("online", {}),
      "sensor.usage": entity("42", {}),
      "sensor.pool_status": entity("healthy", {
        pool_key: "pool-1",
        pool_name: poolName,
      }),
    },
    entities: {
      "sensor.system_status": registry("system_status"),
      "sensor.usage": registry("usage_percent"),
      "sensor.pool_status": registry("pool_status"),
    },
    callService: async () => undefined,
  };
}

function entity(state: string, attributes: Record<string, unknown>) {
  return { state, attributes };
}

function registry(translationKey: string) {
  return {
    platform: INTEGRATION_DOMAIN,
    device_id: "device-a",
    config_entry_id: "entry-a",
    translation_key: translationKey,
    unique_id: `device-a_${translationKey}`,
  };
}
