import { DRIVE_KEYS, POOL_KEYS, SNAPSHOT_KEYS } from "./catalog";
import type { EntityGroupKind } from "./types";

export const OVERVIEW_KEYS = [
  "system_status",
  "overall_status",
  "storage_problem",
  "usage_percent",
  "used_storage",
  "available_storage",
  "read_throughput",
  "write_throughput",
];

export const GROUP_KEYS: Record<EntityGroupKind, string[]> = {
  backup: ["backup_run"],
  drive: DRIVE_KEYS,
  pool: POOL_KEYS,
  snapshot: SNAPSHOT_KEYS,
};

export function groupIcon(kind: EntityGroupKind): string {
  switch (kind) {
    case "backup":
      return "mdi:cloud-upload";
    case "drive":
      return "mdi:harddisk";
    case "pool":
      return "mdi:database";
    case "snapshot":
      return "mdi:camera-burst";
  }
}
