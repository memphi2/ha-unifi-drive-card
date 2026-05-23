import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/config";
import { DiscoveryCache } from "../src/discovery-cache";
import type { HomeAssistant } from "../src/types";
import { INTEGRATION_DOMAIN } from "../src/types";

describe("DiscoveryCache", () => {
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
