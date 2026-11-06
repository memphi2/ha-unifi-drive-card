import { ENTITY_DEFINITIONS } from "./catalog";
import { discoverEntities } from "./discovery";
import type {
  DiscoveredEntities,
  HomeAssistant,
  NormalizedUnifiDriveCardConfig,
} from "./types";

const DISCOVERY_DOMAINS = new Set(ENTITY_DEFINITIONS.map((definition) => definition.domain));
const CONFIG_SIGNATURE_CACHE = new WeakMap<NormalizedUnifiDriveCardConfig, string>();
const DISCOVERY_ATTRIBUTES = [
  "friendly_name", "pool_key", "pool_name", "drive_key", "drive_name",
  "target_key", "target_name", "target_type", "task_id", "task_name",
];
type StateSnapshot = ReadonlyMap<string, string>;
// HA replaces state maps; share projections without retaining old snapshots globally.
const STATE_SNAPSHOTS = new WeakMap<HomeAssistant["states"], StateSnapshot>();
const EMPTY_STATE_SNAPSHOT: StateSnapshot = new Map();

export class DiscoveryCache {
  private _entry?: {
    configSignature: string;
    registrySignature: string;
    stateSnapshot: StateSnapshot;
    discovered: DiscoveredEntities;
  };
  private _registrySource?: HomeAssistant["entities"];
  private _registrySignatureCache = "";
  private _stateSource?: HomeAssistant["states"];
  private _stateSnapshotCache = EMPTY_STATE_SNAPSHOT;

  public get(
    hass: HomeAssistant,
    config: NormalizedUnifiDriveCardConfig,
  ): DiscoveredEntities {
    const configSignature = discoveryConfigSignature(config);
    if (
      this._entry &&
      this._entry.configSignature === configSignature &&
      this._registrySource === hass.entities &&
      this._stateSource === hass.states
    ) {
      return this._entry.discovered;
    }
    const registrySignature = this._registrySignature(hass);
    const stateSnapshot = this._stateSnapshot(hass);
    if (
      this._entry &&
      this._entry.configSignature === configSignature &&
      this._entry.registrySignature === registrySignature &&
      equalStateSnapshots(this._entry.stateSnapshot, stateSnapshot)
    ) {
      return this._entry.discovered;
    }
    const discovered = discoverEntities(hass, config);
    this._entry = {
      configSignature,
      registrySignature,
      stateSnapshot,
      discovered,
    };
    return discovered;
  }

  public clear(): void {
    this._entry = undefined;
    this._registrySource = undefined;
    this._registrySignatureCache = "";
    this._stateSource = undefined;
    this._stateSnapshotCache = EMPTY_STATE_SNAPSHOT;
  }

  private _registrySignature(hass: HomeAssistant): string {
    const source = hass.entities;
    if (this._registrySource === source) {
      return this._registrySignatureCache;
    }
    this._registrySource = source;
    this._registrySignatureCache = registrySignature(hass);
    return this._registrySignatureCache;
  }

  private _stateSnapshot(hass: HomeAssistant): StateSnapshot {
    const source = hass.states;
    if (this._stateSource === source) {
      return this._stateSnapshotCache;
    }
    this._stateSource = source;
    this._stateSnapshotCache = stateSnapshot(hass);
    return this._stateSnapshotCache;
  }
}

function discoveryConfigSignature(config: NormalizedUnifiDriveCardConfig): string {
  const cached = CONFIG_SIGNATURE_CACHE.get(config);
  if (cached !== undefined) {
    return cached;
  }
  const signature = JSON.stringify({
    device_id: config.device_id ?? "",
    hide_entities: config.hide_entities,
    entities: config.entities,
  });
  CONFIG_SIGNATURE_CACHE.set(config, signature);
  return signature;
}

function registrySignature(hass: HomeAssistant): string {
  const entities = hass.entities ?? {};
  let signature = "";
  for (const entityId in entities) {
    if (!hasOwn(entities, entityId)) {
      continue;
    }
    if (!supportedDomain(entityId)) {
      continue;
    }
    const registry = entities[entityId];
    signature += `${entityId}\u001f${registry?.config_entry_id ?? ""}\u001f${registry?.device_id ?? ""}\u001f${registry?.disabled_by ?? ""}\u001f${registry?.hidden === true ? "1" : ""}\u001f${registry?.hidden_by ?? ""}\u001f${registry?.platform ?? ""}\u001f${registry?.translation_key ?? ""}\u001f${registry?.unique_id ?? ""}\u001e`;
  }
  return signature;
}

function stateSnapshot(hass: HomeAssistant): StateSnapshot {
  const states = hass.states;
  if (!states || typeof states !== "object" || Array.isArray(states)) {
    return EMPTY_STATE_SNAPSHOT;
  }
  const cached = STATE_SNAPSHOTS.get(states);
  if (cached) {
    return cached;
  }
  const snapshot = new Map<string, string>();
  for (const entityId in states) {
    if (!hasOwn(states, entityId)) {
      continue;
    }
    if (!supportedDomain(entityId)) {
      continue;
    }
    const state = states[entityId];
    const attributes =
      state?.attributes && typeof state.attributes === "object" && !Array.isArray(state.attributes)
        ? state.attributes
        : {};
    snapshot.set(entityId, JSON.stringify([Boolean(state), ...DISCOVERY_ATTRIBUTES.map((key) => {
      const value = attributes[key];
      return value == null ? "" : String(value).trim();
    })]));
  }
  STATE_SNAPSHOTS.set(states, snapshot);
  return snapshot;
}

function equalStateSnapshots(left: StateSnapshot, right: StateSnapshot): boolean {
  if (left === right) return true;
  if (left.size !== right.size) return false;
  for (const [entityId, signature] of left) {
    if (right.get(entityId) !== signature) return false;
  }
  return true;
}

function supportedDomain(entityId: string): boolean {
  const separator = entityId.indexOf(".");
  if (separator <= 0) {
    return false;
  }
  const domain = entityId.slice(0, separator);
  return domain ? DISCOVERY_DOMAINS.has(domain as (typeof ENTITY_DEFINITIONS)[number]["domain"]) : false;
}

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}
