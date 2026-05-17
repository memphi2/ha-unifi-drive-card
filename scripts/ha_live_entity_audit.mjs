#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_URL = "http://127.0.0.1:8123";
const baseUrl = (process.env.HA_TEST_URL || DEFAULT_URL).replace(/\/$/, "");
const username = process.env.HA_TEST_USERNAME || "";
const password = process.env.HA_TEST_PASSWORD || "";
const configDir = process.env.HA_CARD_CONFIG_DIR || "";
const expectedDomains = new Set([
  "binary_sensor",
  "button",
  "number",
  "select",
  "sensor",
  "switch",
  "time",
  "update",
]);
const expectedKeys = JSON.parse(
  await readFile("test/fixtures/integration-entity-keys.json", "utf8"),
);
const expectedKeySet = new Set(
  expectedKeys.map((item) => `${item.domain}.${item.key}`),
);

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
  }
  return body;
}

async function login() {
  if (!username || !password) {
    throw new Error("HA_TEST_USERNAME and HA_TEST_PASSWORD are required");
  }
  const clientId = "http://localhost/";
  const flow = await requestJson(`${baseUrl}/auth/login_flow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      handler: ["homeassistant", null],
      redirect_uri: clientId,
    }),
  });
  const loginFlow = await requestJson(`${baseUrl}/auth/login_flow/${flow.flow_id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      username,
      password,
    }),
  });
  const token = await requestJson(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: loginFlow.result,
      client_id: clientId,
    }),
  });
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    clientId,
  };
}

async function revokeRefreshToken(refreshToken, clientId) {
  if (!refreshToken) {
    return;
  }
  await requestJson(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "delete",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
}

function isUnifiDriveState(state) {
  const entityId = String(state.entity_id || "").toLowerCase();
  const friendlyName = String(state.attributes?.friendly_name || "").toLowerCase();
  return (
    entityId.includes("unifi_drive") ||
    friendlyName.includes("unifi drive") ||
    friendlyName.includes("unas")
  );
}

async function registryEntities() {
  if (!configDir) {
    return [];
  }
  const registryPath = path.join(configDir, ".storage", "core.entity_registry");
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  return (registry?.data?.entities ?? []).filter(
    (entity) => entity.platform === "unifi_drive",
  );
}

try {
  const token = await login();
  try {
    const states = await requestJson(`${baseUrl}/api/states`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    const registry = await registryEntities();
    const registryEntityIds = new Set(registry.map((entity) => entity.entity_id));
    const unifiStates = registryEntityIds.size
      ? states.filter((state) => registryEntityIds.has(state.entity_id))
      : states.filter(isUnifiDriveState);
    const domains = new Map();
    for (const state of unifiStates) {
      const domain = String(state.entity_id || "").split(".", 1)[0];
      domains.set(domain, (domains.get(domain) ?? 0) + 1);
    }
    const unexpectedDomains = [...domains.keys()].filter((domain) => !expectedDomains.has(domain));
    if (!unifiStates.length) {
      throw new Error("no live UniFi Drive-like entities found");
    }
    if (!domains.has("sensor") && !domains.has("binary_sensor")) {
      throw new Error("no live UniFi Drive storage entity found");
    }
    if (unexpectedDomains.length) {
      throw new Error(`unsupported live UniFi Drive domains: ${unexpectedDomains.join(", ")}`);
    }
    if (registry.length) {
      const liveKeys = new Set(
        registry
          .filter(
            (entity) =>
              !entity.disabled_by &&
              !entity.hidden_by &&
              entity.hidden !== true &&
              typeof entity.translation_key === "string",
          )
          .map((entity) => {
            const domain = String(entity.entity_id || "").split(".", 1)[0];
            return `${domain}.${entity.translation_key}`;
          }),
      );
      const unknownKeys = [...liveKeys].filter((key) => !expectedKeySet.has(key));
      const missingKeys = [...expectedKeySet].filter((key) => !liveKeys.has(key));
      if (unknownKeys.length) {
        throw new Error(`live integration exposes unknown keys: ${unknownKeys.join(", ")}`);
      }
      if (missingKeys.length) {
        throw new Error(`live integration keys missing from HA: ${missingKeys.join(", ")}`);
      }
    }
    pass(
      `live HA UniFi Drive entities=${unifiStates.length} domains=${[...domains.entries()]
        .map(([domain, count]) => `${domain}:${count}`)
        .join(",")}`,
    );
  } finally {
    try {
      await revokeRefreshToken(token.refreshToken, token.clientId);
    } catch {
      // The card smoke script performs config-file token cleanup when needed; this
      // audit does not mutate the HA config share.
    }
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
