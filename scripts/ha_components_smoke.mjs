#!/usr/bin/env node
/* global window, document, customElements, AbortSignal */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { URL } from "node:url";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdtemp, readdir, rm } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import puppeteer from "puppeteer-core";

const exec = promisify(execFile);
const baselines = JSON.parse(
  await readFile("test/fixtures/ha-frontends.json", "utf8"),
);
const selected = process.argv[2] ? [process.argv[2]] : Object.keys(baselines);
for (const key of selected) {
  assert(baselines[key], `Unknown frontend baseline: ${key}`);
  await runBaseline(baselines[key]);
}

async function runBaseline(baseline) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "unas-components-"));
  let browser;
  let server;
  try {
    const response = await fetch(baseline.url, {
      signal: AbortSignal.timeout(120000),
    });
    assert(response.ok, `Frontend download failed: ${response.status}`);
    const wheel = Buffer.from(await response.arrayBuffer());
    assert.equal(
      createHash("sha256").update(wheel).digest("hex"),
      baseline.sha256,
    );
    const archive = path.join(temporary, "frontend.whl");
    await writeFile(archive, wheel);
    await exec("unzip", [
      "-q",
      archive,
      "hass_frontend/frontend_latest/*.js",
      "hass_frontend/static/translations/*.json",
      "-d",
      temporary,
    ]);
    const root = path.join(temporary, "hass_frontend");
    const app = (await readdir(path.join(root, "frontend_latest"))).find(
      (file) => /^app\.[a-f0-9]+\.js$/.test(file),
    );
    assert(app, "Frontend app entrypoint missing");
    const bundle = await readFile("dist/ha-unifi-drive-card.js");
    server = http.createServer(async (request, response) => {
      try {
        const pathname = new URL(request.url, "http://localhost").pathname;
        if (pathname === "/") {
          response.setHeader("Content-Type", "text/html");
          response.end(`<!doctype html><meta charset="utf-8"><body>
          <script>window.hassConnection=new Promise(()=>{});window.latestJS=true;</script>
          <script type="module" src="/frontend_latest/${app}"></script></body>`);
          return;
        }
        response.setHeader(
          "Content-Type",
          pathname.endsWith(".json") ? "application/json" : "text/javascript",
        );
        if (pathname === "/card.js") {
          response.end(bundle);
          return;
        }
        const file = path.resolve(root, `.${decodeURIComponent(pathname)}`);
        if (!file.startsWith(`${root}${path.sep}`))
          throw new Error("Invalid path");
        response.end(await readFile(file));
      } catch {
        response.writeHead(404).end();
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome",
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.stack ?? String(error)));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const contract = JSON.parse(
      await readFile("test/fixtures/unas-entities.json", "utf8"),
    );
    await page.evaluate(async (contract) => {
      for (const [entityId, state] of Object.entries(contract.states)) {
        state.entity_id = entityId;
      }
      for (const [entityId, entity] of Object.entries(contract.entities)) {
        entity.entity_id = entityId;
        entity.labels = [];
        entity.original_name =
          contract.states[entityId]?.attributes.friendly_name;
      }
      contract.devices = {
        "contract-device": {
          id: "contract-device",
          name: "Storage",
          labels: [],
          config_entries: ["contract-entry"],
        },
      };
      await customElements.whenDefined("partial-panel-resolver");
      const router = document.createElement("partial-panel-resolver");
      await router
        ._getRoutes({
          lovelace: { component_name: "lovelace", url_path: "lovelace" },
        })
        .routes.lovelace.load();
      const helpers = await window.loadCardHelpers();
      helpers.createCardElement({ type: "entities", entities: [] });
      await customElements.whenDefined("hui-entities-card");
      await customElements.get("hui-entities-card").getConfigElement();
      await import("/card.js");
      const hass = {
        ...contract,
        areas: {},
        floors: {},
        labels: {},
        services: {},
        language: "en",
        locale: {
          language: "en",
          number_format: "language",
          time_format: "24",
        },
        translationMetadata: {
          translations: { en: { name: "English", nativeName: "English" } },
        },
        config: { components: [], unit_system: { temperature: "°C" } },
        themes: { themes: {}, darkMode: false },
        selectedTheme: {},
        localize: (key) => key.split(".").at(-1),
        formatEntityState: (state) => state.state,
        formatEntityName: (state) => state.attributes.friendly_name,
        loadBackendTranslation: async () => undefined,
        loadFragmentTranslation: async () => undefined,
        callWS: async ({ type }) =>
          type === "config_entries/get"
            ? [
                {
                  entry_id: "contract-entry",
                  domain: "unifi_unas",
                  title: "Storage",
                },
              ]
            : [],
        callService: async () => undefined,
        connection: { subscribeMessage: async () => () => undefined },
      };
      document.addEventListener("context-request", (event) => {
        const contexts = {
          hassRegistries: hass,
          hassInternationalization: hass,
          hassApi: hass,
          hassConfig: hass,
          hassUi: hass,
          hassFormatters: hass,
          hassConnection: hass,
          states: hass.states,
          entities: hass.entities,
          devices: hass.devices,
          areas: {},
          floors: {},
          labels: [],
          locale: hass.locale,
          localize: hass.localize,
          config: hass.config,
          themes: hass.themes,
          narrowViewport: false,
          reducedMotion: true,
          related: undefined,
          brandsAccessToken: undefined,
        };
        if (Object.hasOwn(contexts, event.context)) {
          event.stopPropagation();
          event.callback(contexts[event.context], () => undefined);
        }
      });
      const config = {
        type: "custom:unifi-drive-card",
        device_id: "contract-device",
      };
      const card = document.createElement("unifi-drive-card");
      card.hass = hass;
      card.setConfig(config);
      document.body.append(card);
      await card.updateComplete;
      const editor = document.createElement("unifi-drive-card-editor");
      editor.hass = hass;
      editor.setConfig(config);
      window.__editorChanges = [];
      editor.addEventListener("config-changed", (event) =>
        window.__editorChanges.push(event.detail.config),
      );
      document.body.append(editor);
      await editor.updateComplete;
    }, contract);
    const name = await page.waitForSelector(
      'unifi-drive-card-editor >>> ha-selector[data-editor-field="name"] >>> input',
    );
    await name.click();
    await name.type("Storage fixture");
    await page.keyboard.press("Tab");
    await page.waitForFunction(() =>
      window.__editorChanges.some(
        (config) => config.name === "Storage fixture",
      ),
    );
    await page.click(
      "unifi-drive-card-editor >>> details.advanced-editor > summary",
    );
    const compact = await page.waitForSelector(
      "unifi-drive-card-editor >>> .advanced-group ha-switch",
    );
    await compact.click();
    await page.waitForFunction(
      () => window.__editorChanges.at(-1)?.compact === false,
    );
    await compact.click();
    await page.waitForFunction(
      () => window.__editorChanges.at(-1)?.compact === true,
    );
    const result = await page.evaluate(() => {
      const root = document.querySelector("unifi-drive-card").shadowRoot;
      return {
        height: root.querySelector("ha-card").getBoundingClientRect().height,
        rows: root.querySelectorAll("[data-entity-key]").length,
        grid: document.querySelector("unifi-drive-card").getGridOptions(),
      };
    });
    assert(
      result.height > 100 && result.rows > 5,
      "Card did not render integration entities",
    );
    assert(result.grid.columns > 0, "Sections sizing missing");
    assert.deepEqual(errors, [], "HA component errors");
    console.log(
      `PASS: original HA ${baseline.homeassistant} components (${baseline.version}), card render, editor name and switch round trip`,
    );
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await rm(temporary, { recursive: true, force: true });
    }
  }
}
