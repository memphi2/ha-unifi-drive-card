import { ENTITY_DEFINITIONS } from "./catalog";
import { discoverEntities } from "./discovery";
import type {
  DiscoveredEntities,
  HomeAssistant,
  NormalizedUnifiDriveCardConfig,
} from "./types";

const DISCOVERY_DOMAINS = new Set(ENTITY_DEFINITIONS.map((definition) => definition.domain));
const DISCOVERY_ATTRIBUTE_KEYS = [
  "drive_key",
  "drive_name",
  "pool_key",
  "pool_name",
  "target_key",
  "target_name",
  "target_type",
  "task_id",
  "task_name",
  "friendly_name",
];

export class DiscoveryCache {
  private _entry?: {
    configSignature: string;
    registrySignature: string;
    stateSignature: string;
    discovered: DiscoveredEntities;
  };
  private _registrySource?: HomeAssistant["entities"];
  private _registrySignatureCache = "";
  private _stateSource?: HomeAssistant["states"];
  private _stateSignatureCache = "";

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
    const stateSignature = this._stateSignature(hass);
    if (
      this._entry &&
      this._entry.configSignature === configSignature &&
      this._entry.registrySignature === registrySignature &&
      this._entry.stateSignature === stateSignature
    ) {
      return this._entry.discovered;
    }
    const discovered = discoverEntities(hass, config);
    this._entry = {
      configSignature,
      registrySignature,
      stateSignature,
      discovered,
    };
    return discovered;
  }

  public clear(): void {
    this._entry = undefined;
    this._registrySource = undefined;
    this._registrySignatureCache = "";
    this._stateSource = undefined;
    this._stateSignatureCache = "";
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

  private _stateSignature(hass: HomeAssistant): string {
    const source = hass.states;
    if (this._stateSource === source) {
      return this._stateSignatureCache;
    }
    this._stateSource = source;
    this._stateSignatureCache = stateSignature(hass);
    return this._stateSignatureCache;
  }
}

function discoveryConfigSignature(config: NormalizedUnifiDriveCardConfig): string {
  return JSON.stringify({
    device_id: config.device_id ?? "",
    hide_entities: config.hide_entities,
    entities: config.entities,
  });
}

function registrySignature(hass: HomeAssistant): string {
  return Object.entries(hass.entities ?? {})
    .filter(([entityId]) => supportedDomain(entityId))
    .map(([entityId, registry]) =>
      [
        entityId,
        registry?.config_entry_id ?? "",
        registry?.device_id ?? "",
        registry?.disabled_by ?? "",
        registry?.hidden === true ? "1" : "",
        registry?.hidden_by ?? "",
        registry?.platform ?? "",
        registry?.translation_key ?? "",
        registry?.unique_id ?? "",
      ].join("\u001f"),
    )
    .sort((left, right) => left.localeCompare(right))
    .join("\u001e");
}

function stateSignature(hass: HomeAssistant): string {
  return Object.entries(hass.states ?? {})
    .filter(([entityId]) => supportedDomain(entityId))
    .map(([entityId, state]) =>
      [
        entityId,
        ...DISCOVERY_ATTRIBUTE_KEYS.map((key) => String(state?.attributes?.[key] ?? "")),
      ].join("\u001f"),
    )
    .sort((left, right) => left.localeCompare(right))
    .join("\u001e");
}

function supportedDomain(entityId: string): boolean {
  const domain = entityId.split(".", 1)[0];
  return domain
    ? DISCOVERY_DOMAINS.has(domain as (typeof ENTITY_DEFINITIONS)[number]["domain"])
    : false;
}
