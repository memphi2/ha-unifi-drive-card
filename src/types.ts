import type { TemplateResult } from "lit";

export const INTEGRATION_DOMAIN = "unifi_drive";

export type EntityDomain =
  | "binary_sensor"
  | "button"
  | "number"
  | "select"
  | "sensor"
  | "switch"
  | "time"
  | "update";

export type SectionId =
  | "overview"
  | "storage"
  | "pools"
  | "drives"
  | "snapshots"
  | "system"
  | "updates"
  | "diagnostics"
  | "actions";

export type EntityGroupKind = "pool" | "drive" | "snapshot" | "backup";
export type EntityKey = string;

export interface HassEntity {
  entity_id?: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

export interface HassRegistryEntity {
  area_id?: string | null;
  config_entry_id?: string | null;
  device_id?: string | null;
  disabled_by?: string | null;
  display_precision?: number | null;
  entity_category?: string | null;
  hidden?: boolean | null;
  hidden_by?: string | null;
  icon?: string | null;
  name?: string | null;
  original_name?: string | null;
  platform?: string | null;
  translation_key?: string | null;
  unique_id?: string | null;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  entities?: Record<string, HassRegistryEntity>;
  locale?: {
    language?: string;
  };
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
  ) => Promise<unknown>;
  formatEntityState?: (stateObj: HassEntity) => string;
  formatEntityName?: (
    stateObj: HassEntity,
    components?: Array<{ type: string }>,
    options?: { separator?: string },
  ) => string;
  localize?: (key: string, ...args: unknown[]) => string;
}

export interface UnifiDriveCardConfig {
  type?: string;
  entity?: string;
  device_id?: string;
  name?: unknown;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  compact?: boolean;
  show_unavailable?: boolean;
  show_optional?: boolean;
  show_diagnostics?: boolean;
  show_dangerous_actions?: boolean;
  show_icon_animations?: boolean;
  show_display_buttons?: boolean;
  overview_columns?: number;
  max_sensor_rows?: number;
  sections?: SectionId[];
  overview_entities?: EntityKey[];
  hide_entities?: EntityKey[];
  entities?: Record<string, string | Record<string, string> | undefined>;
}

export interface ActionConfig {
  action?: string;
  entity?: string;
  [key: string]: unknown;
}

export interface NormalizedUnifiDriveCardConfig
  extends Required<
    Pick<
      UnifiDriveCardConfig,
      | "compact"
      | "show_unavailable"
      | "show_optional"
      | "show_diagnostics"
      | "show_dangerous_actions"
      | "show_icon_animations"
      | "show_display_buttons"
      | "overview_columns"
      | "max_sensor_rows"
    >
  > {
  type: string;
  entity?: string;
  device_id?: string;
  name?: unknown;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  sections: SectionId[];
  overview_entities: EntityKey[];
  hide_entities: EntityKey[];
  entities: Record<string, string | Record<string, string> | undefined>;
}

export interface EntityDefinition {
  key: EntityKey;
  domain: EntityDomain;
  section: SectionId;
  label: string;
  icon: string;
  aliases?: string[];
  optional?: boolean;
  diagnostic?: boolean;
  dangerous?: boolean;
  dynamic?: EntityGroupKind;
  order: number;
}

export interface EntityGroup {
  kind: EntityGroupKind;
  id: string;
  name: string;
  type?: string;
  entityIds: Record<EntityKey, string>;
}

export interface DiscoveredEntities {
  baseEntity?: string;
  configEntryId?: string;
  deviceId?: string;
  entityIds: Record<EntityKey, string>;
  groups: Record<EntityGroupKind, EntityGroup[]>;
  definitions: EntityDefinition[];
}

export type Renderable =
  | TemplateResult
  | typeof import("lit").nothing
  | string
  | number
  | null
  | undefined;
