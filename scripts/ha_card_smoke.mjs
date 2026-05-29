#!/usr/bin/env node
/* global URL, WebSocket, clearTimeout */
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_URL = "http://127.0.0.1:8123";
const DIST_FILE = "dist/ha-unifi-drive-card.js";

const args = new Set(process.argv.slice(2));
const shouldDeploy = args.has("--deploy");
const shouldUninstall = args.has("--uninstall");
const baseUrl = (process.env.HA_TEST_URL || DEFAULT_URL).replace(/\/$/, "");
const accessToken = process.env.HA_TEST_TOKEN || "";
const username = process.env.HA_TEST_USERNAME || "";
const password = process.env.HA_TEST_PASSWORD || "";
const deployDir = process.env.HA_CARD_DEPLOY_DIR || "";
const configDir = process.env.HA_CARD_CONFIG_DIR || "";
const resourceUrl = process.env.HA_CARD_RESOURCE_URL || resourceUrlFromDeployDir();

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
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
  if (accessToken) {
    return {
      accessToken,
      refreshToken: "",
    };
  }
  if (!username || !password) {
    throw new Error("HA_TEST_TOKEN or HA_TEST_USERNAME and HA_TEST_PASSWORD are required");
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
  };
}

async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) {
    return;
  }
  await requestJson(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: refreshToken,
      action: "revoke",
    }),
  });
}

async function cleanupLocalhostTokens() {
  if (!configDir) {
    return 0;
  }
  const authPath = path.join(configDir, ".storage", "auth");
  const auth = JSON.parse(await readFile(authPath, "utf8"));
  const tokens = auth?.data?.refresh_tokens;
  let removed = 0;
  if (Array.isArray(tokens)) {
    auth.data.refresh_tokens = tokens.filter((token) => {
      const remove = token?.client_id === "http://localhost/";
      if (remove) {
        removed += 1;
      }
      return !remove;
    });
  } else if (tokens && typeof tokens === "object") {
    for (const [key, token] of Object.entries(tokens)) {
      if (token?.client_id === "http://localhost/") {
        delete tokens[key];
        removed += 1;
      }
    }
  }
  if (removed > 0) {
    await writeFile(authPath, JSON.stringify(auth, null, 2), "utf8");
  }
  return removed;
}

async function cleanupLocalhostTokensWithRetry() {
  let removedTotal = 0;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (attempt > 0) {
      await sleep(500);
    }
    removedTotal += await cleanupLocalhostTokens();
    const remaining = await countLocalhostTokens();
    if (remaining === 0) {
      await sleep(3000);
      removedTotal += await cleanupLocalhostTokens();
      const settledRemaining = await countLocalhostTokens();
      if (settledRemaining === 0) {
        return { removed: removedTotal, remaining: settledRemaining };
      }
    }
  }
  await sleep(1500);
  removedTotal += await cleanupLocalhostTokens();
  return { removed: removedTotal, remaining: await countLocalhostTokens() };
}

async function countLocalhostTokens() {
  if (!configDir) {
    return 0;
  }
  const authPath = path.join(configDir, ".storage", "auth");
  const auth = JSON.parse(await readFile(authPath, "utf8"));
  const tokens = auth?.data?.refresh_tokens;
  const values = Array.isArray(tokens)
    ? tokens
    : tokens && typeof tokens === "object"
      ? Object.values(tokens)
      : [];
  return values.filter((token) => token?.client_id === "http://localhost/").length;
}

async function validateBundle() {
  const bundle = await readFile(DIST_FILE, "utf8");
  if (!bundle.includes("unifi-drive-card")) {
    throw new Error(`${DIST_FILE} does not contain the custom element name`);
  }
  const fileStat = await stat(DIST_FILE);
  pass(`bundle exists (${Math.round(fileStat.size / 1024)} KiB)`);
}

async function deployBundle() {
  if (!shouldDeploy) {
    return;
  }
  if (!deployDir) {
    throw new Error("HA_CARD_DEPLOY_DIR is required with --deploy");
  }
  await cleanDeployDir();
  await copyWithRetry(DIST_FILE, path.join(deployDir, "ha-unifi-drive-card.js"));
  await copyWithRetry(`${DIST_FILE}.map`, path.join(deployDir, "ha-unifi-drive-card.js.map"));
  pass(`bundle clean-installed to ${deployDir}`);
  await validateServedBundle();
}

async function validateHaStates(accessToken) {
  const states = await requestJson(`${baseUrl}/api/states`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const registry = await registryEntities();
  const registryEntityIds = new Set(registry.map((entity) => entity.entity_id));
  const unifiStates = registryEntityIds.size
    ? states.filter((state) => registryEntityIds.has(state.entity_id))
    : states.filter(isUnifiDriveState);
  const hasStorage = unifiStates.some((state) =>
    /^(binary_sensor|sensor)\./.test(String(state.entity_id)),
  );
  const hasControl = unifiStates.some((state) =>
    /^(button|number|select|switch|time|update)\./.test(String(state.entity_id)),
  );
  if (!unifiStates.length) {
    throw new Error("no UniFi Drive-like Home Assistant states found");
  }
  if (!hasStorage) {
    throw new Error("no UniFi Drive storage state found");
  }
  if (!hasControl) {
    throw new Error("no UniFi Drive control entities found");
  }
  pass(`HA API exposes ${unifiStates.length} UniFi Drive-like states`);
}

async function registryEntities() {
  if (!configDir) {
    return [];
  }
  try {
    const registryPath = path.join(configDir, ".storage", "core.entity_registry");
    const registry = JSON.parse(await readFile(registryPath, "utf8"));
    return (registry?.data?.entities ?? []).filter(
      (entity) => entity.platform === "unifi_unas",
    );
  } catch {
    return [];
  }
}

function isUnifiDriveState(state) {
  const entityId = String(state.entity_id || "").toLowerCase();
  const friendlyName = String(state.attributes?.friendly_name || "").toLowerCase();
  return (
    entityId.includes("unifi_unas") ||
    friendlyName.includes("unifi drive") ||
    friendlyName.includes("unas")
  );
}

async function cleanDeployDir() {
  await mkdirWithRetry(deployDir);
  for (const filename of [
    "ha-unifi-drive-card.js",
    "ha-unifi-drive-card.js.map",
    "ha-unifi-drive-card.js.gz",
  ]) {
    await rm(path.join(deployDir, filename), {
      force: true,
      maxRetries: 3,
      retryDelay: 500,
    });
  }
}

async function mkdirWithRetry(directory) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (await canWriteDirectory(directory)) {
      return;
    }
    try {
      await mkdir(path.dirname(directory), { recursive: true });
      await mkdir(directory, { recursive: true });
      return;
    } catch (error) {
      if (error?.code === "EEXIST") {
        return;
      }
      try {
        const directoryStat = await stat(directory);
        if (directoryStat.isDirectory()) {
          return;
        }
      } catch {
        // CIFS can briefly report a removed directory as both absent and existing.
      }
      if (attempt === 11) {
        throw error;
      }
      await sleep(1000);
    }
  }
}

async function canWriteDirectory(directory) {
  const probe = path.join(directory, `ha-unifi-drive-card-smoke-${process.pid}.tmp`);
  try {
    await writeFile(probe, "ok", "utf8");
    await rm(probe, { force: true });
    return true;
  } catch {
    return false;
  }
}

async function copyWithRetry(source, target) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await mkdirWithRetry(path.dirname(target));
      try {
        await copyFile(source, target);
      } catch (error) {
        if (!isCopyFileUnsupported(error)) {
          throw error;
        }
        const content = await readFile(source);
        await writeFile(target, content);
      }
      return;
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }
      await sleep(500);
    }
  }
}

function isCopyFileUnsupported(error) {
  const code = String(error?.code || "");
  return code === "ENOTSUP" || code === "EXDEV";
}

async function validateServedBundle() {
  if (!resourceUrl) {
    return;
  }
  const expected = await readFile(DIST_FILE, "utf8");
  const url = new URL(resourceUrl, baseUrl);
  url.searchParams.set("smoke", String(Date.now()));
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(url);
      const actual = await response.text();
      if (!response.ok) {
        throw new Error(`deployed bundle is not reachable: HTTP ${response.status}`);
      }
      if (actual !== expected) {
        throw new Error("deployed bundle differs from local dist bundle");
      }
      pass(`deployed bundle served from ${resourceUrl.split("?")[0]}`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 7) {
        await sleep(750);
      }
    }
  }
  throw lastError;
}

async function upsertLovelaceResource(accessToken) {
  if (!shouldDeploy || !resourceUrl) {
    return;
  }
  const ws = new WebSocket(`${baseUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:")}/api/websocket`);
  await waitForWebSocketOpen(ws);
  await waitForMessage(ws);
  ws.send(JSON.stringify({ type: "auth", access_token: accessToken }));
  const auth = await waitForMessage(ws);
  if (auth.type !== "auth_ok") {
    throw new Error(`HA websocket auth failed: ${auth.type}`);
  }
  let id = 1;
  const existing = await sendWebSocketCommand(ws, id, { type: "lovelace/resources" });
  id += 1;
  for (const item of existing) {
    if (String(item.url || "").includes("/ha-unifi-drive-card/ha-unifi-drive-card.js")) {
      await sendWebSocketCommand(ws, id, {
        type: "lovelace/resources/delete",
        resource_id: item.id,
      });
      id += 1;
    }
  }
  await sendWebSocketCommand(ws, id, {
    type: "lovelace/resources/create",
    res_type: "module",
    url: resourceUrl,
  });
  ws.close();
  pass(`Lovelace resource registered as ${resourceUrl}`);
}

async function removeLovelaceResource(accessToken) {
  if (!resourceUrl) {
    return;
  }
  const ws = new WebSocket(`${baseUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:")}/api/websocket`);
  await waitForWebSocketOpen(ws);
  await waitForMessage(ws);
  ws.send(JSON.stringify({ type: "auth", access_token: accessToken }));
  const auth = await waitForMessage(ws);
  if (auth.type !== "auth_ok") {
    throw new Error(`HA websocket auth failed during uninstall: ${auth.type}`);
  }
  let id = 1;
  const existing = await sendWebSocketCommand(ws, id, { type: "lovelace/resources" });
  id += 1;
  for (const item of existing) {
    if (String(item.url || "").includes("ha-unifi-drive-card.js")) {
      await sendWebSocketCommand(ws, id, {
        type: "lovelace/resources/delete",
        resource_id: item.id,
      });
      id += 1;
    }
  }
  ws.close();
  pass("Lovelace resource removed");
}

async function uninstallBundle() {
  if (!deployDir) {
    return;
  }
  for (const filename of [
    "ha-unifi-drive-card.js",
    "ha-unifi-drive-card.js.map",
    "ha-unifi-drive-card.js.gz",
  ]) {
    await rm(path.join(deployDir, filename), {
      force: true,
      maxRetries: 3,
      retryDelay: 500,
    });
  }
  pass(`bundle removed from ${deployDir}`);
}

function waitForWebSocketOpen(ws) {
  return new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}

function waitForMessage(ws) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("HA websocket timed out"));
    }, 5000);
    ws.addEventListener(
      "message",
      (event) => {
        clearTimeout(timeout);
        resolve(JSON.parse(event.data));
      },
      { once: true },
    );
    ws.addEventListener("error", reject, { once: true });
  });
}

async function sendWebSocketCommand(ws, id, message) {
  ws.send(JSON.stringify({ id, ...message }));
  const response = await waitForMessage(ws);
  if (!response.success) {
    throw new Error(`HA websocket command failed: ${JSON.stringify(response.error)}`);
  }
  return response.result;
}

function resourceUrlFromDeployDir() {
  if (!deployDir || !configDir) {
    return "";
  }
  const wwwDir = path.resolve(configDir, "www");
  const resolvedDeployDir = path.resolve(deployDir);
  const relativeDir = path.relative(wwwDir, resolvedDeployDir);
  if (relativeDir.startsWith("..") || path.isAbsolute(relativeDir)) {
    return "";
  }
  const version = process.env.HA_CARD_RESOURCE_VERSION || String(Date.now());
  const relativeFile = path
    .join(relativeDir, "ha-unifi-drive-card.js")
    .split(path.sep)
    .filter(Boolean)
    .join("/");
  return `/local/${relativeFile}?v=${version}`;
}

try {
  await validateBundle();
  await deployBundle();
  const token = await login();
  try {
    pass("HA auth login");
    await upsertLovelaceResource(token.accessToken);
    await validateHaStates(token.accessToken);
    if (shouldUninstall) {
      await removeLovelaceResource(token.accessToken);
      await uninstallBundle();
    }
  } finally {
    try {
      await revokeRefreshToken(token.refreshToken);
      pass("HA refresh token revoked");
      const cleanup = await cleanupLocalhostTokensWithRetry();
      if (cleanup.remaining > 0) {
        fail(
          `localhost token cleanup incomplete: removed=${cleanup.removed} remaining=${cleanup.remaining}`,
        );
      } else {
        pass(`localhost token cleanup removed=${cleanup.removed}`);
      }
    } catch (error) {
      console.warn(
        `WARN: HA refresh token revoke failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      const cleanup = await cleanupLocalhostTokensWithRetry();
      if (cleanup.remaining > 0) {
        fail(
          `localhost token cleanup incomplete: removed=${cleanup.removed} remaining=${cleanup.remaining}`,
        );
      } else {
        pass(`localhost token cleanup removed=${cleanup.removed}`);
      }
    }
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
