import type { EntityDefinition, HomeAssistant, SectionId } from "./types";

type Language = "de" | "en";

const EN: Record<string, string> = {
  "button.install": "Install",
  "button.off": "Off",
  "button.on": "On",
  "button.press": "Press",
  "button.turn_off": "Turn off",
  "button.turn_on": "Turn on",
  "confirm.run": "Run {label}?",
  "editor.action.call-service": "Call service",
  "editor.action.more-info": "More info",
  "editor.action.navigate": "Navigate",
  "editor.action.none": "None",
  "editor.action.toggle": "Toggle",
  "editor.action.url": "URL",
  "editor.action_entity": "Action entity",
  "editor.anchor_entity": "Anchor entity",
  "editor.compact": "Compact",
  "editor.dangerous_actions": "System actions",
  "editor.device_id": "Device ID",
  "editor.diagnostics": "Diagnostics",
  "editor.double_tap_action": "Double tap action",
  "editor.entities": "Entities",
  "editor.hold_action": "Hold action",
  "editor.icon_animations": "Icon animations",
  "editor.max_sensor_rows": "Max sensor rows",
  "editor.name": "Name",
  "editor.navigation_path": "Navigation path",
  "editor.optional_missing": "Optional missing entities",
  "editor.service": "Service",
  "editor.service_data": "Service data",
  "editor.service_target_area": "Target areas",
  "editor.service_target_device": "Target devices",
  "editor.service_target_entity": "Target entity",
  "editor.tap_action": "Tap action",
  "editor.unavailable": "Unavailable entities",
  "editor.url_path": "URL path",
  "error.action_failed": "Action failed: {message}",
  "label.none": "No data",
  "section.actions": "Backups",
  "section.diagnostics": "Diagnostics",
  "section.drives": "Drives",
  "section.overview": "Overview",
  "section.pools": "Storage pools",
  "section.snapshots": "Snapshots",
  "section.storage": "Storage",
  "section.system": "System",
  "section.updates": "Updates",
  "state.loading": "Loading",
  "state.not_found": "Not found",
  "state.unavailable": "Unavailable",
  "state.unknown": "Unknown",
  "status.discovered": "UniFi Drive discovered",
  "status.problem": "Problem {state}",
  "status.select_entity": "Select a UniFi Drive entity",
  "status.status": "Status {state}",
  "tooltip.install_update": "Install update",
};

const DE: Record<string, string> = {
  "button.install": "Installieren",
  "button.off": "Aus",
  "button.on": "Ein",
  "button.press": "Ausführen",
  "button.turn_off": "Ausschalten",
  "button.turn_on": "Einschalten",
  "confirm.run": "{label} ausführen?",
  "editor.action.call-service": "Dienst aufrufen",
  "editor.action.more-info": "Mehr Info",
  "editor.action.navigate": "Navigieren",
  "editor.action.none": "Keine",
  "editor.action.toggle": "Umschalten",
  "editor.action.url": "URL",
  "editor.action_entity": "Aktions-Entität",
  "editor.anchor_entity": "Anker-Entität",
  "editor.compact": "Kompakt",
  "editor.dangerous_actions": "Systemaktionen",
  "editor.device_id": "Geräte-ID",
  "editor.diagnostics": "Diagnose",
  "editor.double_tap_action": "Doppelklick-Aktion",
  "editor.entities": "Entitäten",
  "editor.hold_action": "Halten-Aktion",
  "editor.icon_animations": "Icon-Animationen",
  "editor.max_sensor_rows": "Maximale Sensorzeilen",
  "editor.name": "Name",
  "editor.navigation_path": "Navigationspfad",
  "editor.optional_missing": "Optionale fehlende Entitäten",
  "editor.service": "Dienst",
  "editor.service_data": "Dienstdaten",
  "editor.service_target_area": "Zielbereiche",
  "editor.service_target_device": "Zielgeräte",
  "editor.service_target_entity": "Ziel-Entität",
  "editor.tap_action": "Klick-Aktion",
  "editor.unavailable": "Nicht verfügbare Entitäten",
  "editor.url_path": "URL-Pfad",
  "error.action_failed": "Aktion fehlgeschlagen: {message}",
  "label.none": "Keine Daten",
  "section.actions": "Backups",
  "section.diagnostics": "Diagnose",
  "section.drives": "Laufwerke",
  "section.overview": "Übersicht",
  "section.pools": "Speicherpools",
  "section.snapshots": "Snapshots",
  "section.storage": "Speicher",
  "section.system": "System",
  "section.updates": "Updates",
  "state.loading": "Lädt",
  "state.not_found": "Nicht gefunden",
  "state.unavailable": "Nicht verfügbar",
  "state.unknown": "Unbekannt",
  "status.discovered": "UniFi Drive erkannt",
  "status.problem": "Problem {state}",
  "status.select_entity": "UniFi-Drive-Entität auswählen",
  "status.status": "Status {state}",
  "tooltip.install_update": "Update installieren",
};

const ENTITY_LABELS_DE: Record<string, string> = {
  at_risk_disk_count: "Gefährdete Laufwerke",
  available_storage: "Freier Speicher",
  average_disk_temperature: "Durchschnittliche Laufwerkstemperatur",
  backup_run: "Backup ausführen",
  cpu_temperature: "CPU-Temperatur",
  degraded_pool_count: "Degradierte Pools",
  drive_power_on_hours: "Betriebsstunden",
  drive_status: "Status",
  drive_temperature: "Temperatur",
  drive_update: "Drive Update",
  drive_version: "Drive Version",
  fan_mode: "Lüftermodus",
  maintenance_active: "Wartung aktiv",
  maintenance_pool_count: "Pools in Wartung",
  overall_status: "Speicherstatus",
  pool_at_risk_drive_count: "Gefährdete Laufwerke",
  pool_available: "Frei",
  pool_average_drive_temperature: "Durchschnittstemperatur",
  pool_capacity: "Kapazität",
  pool_count: "Pool-Anzahl",
  pool_drive_count: "Laufwerke",
  pool_maintenance_active: "Wartung aktiv",
  pool_problem: "Problem",
  pool_raid_level: "RAID-Level",
  pool_rebuild_progress: "Rebuild-Fortschritt",
  pool_status: "Status",
  pool_sync_progress: "Sync-Fortschritt",
  pool_usage_percent: "Auslastung",
  pool_used: "Belegt",
  read_throughput: "Lesedurchsatz",
  reboot: "Neustart",
  shutdown: "Herunterfahren",
  snapshot_create: "Snapshot erstellen",
  snapshot_enabled: "Snapshots",
  snapshot_inventory: "Snapshot-Inventar",
  snapshot_limit: "Snapshot-Limit",
  snapshot_month_day: "Snapshot-Monatstag",
  snapshot_schedule: "Snapshot-Zeitplan",
  snapshot_schedule_time: "Snapshot-Uhrzeit",
  snapshot_weekday: "Snapshot-Wochentag",
  storage_problem: "Speicherproblem",
  system_ip: "System-IP",
  system_status: "Systemstatus",
  system_uptime: "Systemlaufzeit",
  total_storage: "Speicher gesamt",
  unifi_os_update: "UniFi OS Update",
  unifi_os_version: "UniFi OS Version",
  usage_percent: "Speicherauslastung",
  used_storage: "Belegter Speicher",
  wake_on_lan: "Wake on LAN",
  write_throughput: "Schreibdurchsatz",
};

export function languageCode(hass?: HomeAssistant): Language {
  const language =
    hass?.locale?.language ??
    (typeof navigator !== "undefined" ? navigator.language : "") ??
    "";
  return language.toLowerCase().startsWith("de") ? "de" : "en";
}

export function localize(
  hass: HomeAssistant | undefined,
  key: string,
  replacements: Record<string, string | number> = {},
): string {
  const language = languageCode(hass);
  const dictionary = language === "de" ? DE : EN;
  return interpolate(dictionary[key] ?? EN[key] ?? key, replacements);
}

export function sectionLabel(section: SectionId, hass?: HomeAssistant): string {
  return localize(hass, `section.${section}`);
}

export function entityLabel(definition: EntityDefinition, hass?: HomeAssistant): string {
  return languageCode(hass) === "de"
    ? ENTITY_LABELS_DE[definition.key] ?? definition.label
    : definition.label;
}

function interpolate(template: string, replacements: Record<string, string | number>): string {
  return template.replace(/\{([a-z_]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(replacements, key)
      ? String(replacements[key])
      : match,
  );
}
