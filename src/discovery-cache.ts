import { ENTITY_DEFINITIONS } from "./catalog";
import { discoverEntities } from "./discovery";
import type {
  DiscoveredEntities,
  HomeAssistant,
  NormalizedUnifiDriveCardConfig,
} from "./types";

const DISCOVERY_DOMAINS = new Set(ENTITY_DEFINITIONS.map((definition) => definition.domain));
const CONFIG_SIGNATURE_CACHE = new WeakMap<NormalizedUnifiDriveCardConfig, string>();

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

function stateSignature(hass: HomeAssistant): string {
  const states = hass.states && typeof hass.states === "object" ? hass.states : {};
  let signature = "";
  for (const entityId in states) {
    if (!hasOwn(states, entityId)) {
      continue;
    }
    if (!supportedDomain(entityId)) {
      continue;
    }
    const state = states[entityId];
    const friendly =
      state?.attributes && typeof state.attributes === "object" && !Array.isArray(state.attributes)
        ? state.attributes.friendly_name ?? ""
        : "";
    signature += `${entityId}\u001f${typeof friendly === "string" ? friendly : ""}\u001e`;
  }
  return signature;
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
