#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const DOMAIN = "unifi_unas";
const configDir = process.env.HA_CARD_CONFIG_DIR || process.argv[2] || "";

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

async function readStorageJson(name) {
  const file = path.join(configDir, ".storage", name);
  return JSON.parse(await readFile(file, "utf8"));
}

async function checkEntityRegistry() {
  const registry = await readStorageJson("core.entity_registry");
  const entities = registry?.data?.entities;
  if (!Array.isArray(entities)) {
    throw new Error("core.entity_registry data.entities is not an array");
  }
  const unifiEntities = entities.filter((entry) => entry?.platform === DOMAIN);
  const enabled = unifiEntities.filter(
    (entry) => !entry.disabled_by && !entry.hidden_by && entry.hidden !== true,
  );
  if (!unifiEntities.length) {
    throw new Error("no unifi_unas entities found");
  }
  if (
    !enabled.some((entry) =>
      /^(binary_sensor|sensor)\./.test(String(entry.entity_id || "")),
    )
  ) {
    throw new Error("no enabled UniFi Drive storage entity found");
  }
  if (
    !enabled.some((entry) =>
      /^(button|number|select|switch|time|update)\./.test(String(entry.entity_id || "")),
    )
  ) {
    throw new Error("no enabled UniFi Drive control entity found");
  }
  pass(`entity registry exposes ${enabled.length} enabled UniFi Drive entities`);
}

async function checkAuthTokens() {
  const auth = await readStorageJson("auth");
  const tokens = auth?.data?.refresh_tokens;
  const values = Array.isArray(tokens)
    ? tokens
    : tokens && typeof tokens === "object"
      ? Object.values(tokens)
      : [];
  const localhostTokens = values.filter((token) => token?.client_id === "http://localhost/");
  if (localhostTokens.length) {
    throw new Error(`localhost HA refresh tokens remain: ${localhostTokens.length}`);
  }
  pass("no localhost HA refresh tokens remain");
}

try {
  if (!configDir) {
    throw new Error("HA_CARD_CONFIG_DIR or config path argument is required");
  }
  await checkEntityRegistry();
  await checkAuthTokens();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
