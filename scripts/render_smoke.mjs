#!/usr/bin/env node
/* global document, getComputedStyle, PointerEvent, window */
import http from "node:http";
import { readFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const chromePath = process.env.CHROME_BIN || "/usr/bin/google-chrome";
const args = process.argv.slice(2);
const screenshotIndex = args.indexOf("--screenshot");
const screenshotPath = screenshotIndex >= 0 ? args[screenshotIndex + 1] : undefined;
const bundle = await readFile("dist/ha-unifi-drive-card.js", "utf8");

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        margin: 24px;
        background: #202124;
        color: #f5f5f5;
        font-family: Arial, sans-serif;
        --primary-color: #03a9f4;
        --text-primary-color: #ffffff;
        --primary-text-color: #f5f7fb;
        --secondary-text-color: #a7b0be;
        --secondary-background-color: #2f343d;
        --card-background-color: #252a32;
        --ha-card-background: #252a32;
        --divider-color: rgba(255, 255, 255, 0.12);
        --error-color: #ff6b6b;
      }
      ha-card {
        display: block;
        max-width: 820px;
      }
    </style>
  </head>
  <body>
    <script>
      customElements.define("ha-card", class extends HTMLElement {});
      customElements.define("ha-icon", class extends HTMLElement {});
    </script>
    <script type="module" src="/card.js"></script>
    <script type="module">
      await customElements.whenDefined("unifi-drive-card");
      const states = {
        "sensor.system_status": {
          state: "online",
          attributes: { friendly_name: "UniFi Drive System Status" }
        },
        "sensor.usage": {
          state: "42",
          attributes: {
            friendly_name: "UniFi Drive Storage Usage",
            unit_of_measurement: "%"
          }
        },
        "sensor.used": {
          state: "420",
          attributes: {
            friendly_name: "UniFi Drive Used Storage",
            unit_of_measurement: "GiB"
          }
        },
        "binary_sensor.problem": {
          state: "off",
          attributes: { friendly_name: "UniFi Drive Storage Problem" }
        },
        "sensor.pool_status": {
          state: "healthy",
          attributes: {
            friendly_name: "Pool 1 Status",
            pool_key: "pool-1",
            pool_name: "Pool 1"
          }
        },
        "sensor.drive_temperature": {
          state: "31",
          attributes: {
            friendly_name: "Disk 1 Temperature",
            drive_key: "pool-1_sda",
            drive_name: "Disk 1",
            unit_of_measurement: "°C"
          }
        },
        "switch.snapshots": {
          state: "on",
          attributes: {
            friendly_name: "Shared Snapshots",
            target_key: "shared_main",
            target_name: "Shared",
            target_type: "shared"
          }
        },
        "select.fan": {
          state: "Balance",
          attributes: {
            friendly_name: "Fan mode",
            options: ["Quiet", "Balance", "Cooling"]
          }
        },
        "button.shutdown": {
          state: "unknown",
          attributes: { friendly_name: "Shut down" }
        },
        "update.unifi_os": {
          state: "on",
          attributes: {
            friendly_name: "UniFi OS Update",
            installed_version: "4.1.0",
            latest_version: "4.2.0"
          }
        }
      };
      const registry = {
        "sensor.system_status": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "system_status", unique_id: "dev-a_system_status" },
        "sensor.usage": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "usage_percent", unique_id: "dev-a_usage_percent" },
        "sensor.used": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "used_storage", unique_id: "dev-a_used_storage" },
        "binary_sensor.problem": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "storage_problem", unique_id: "dev-a_storage_problem" },
        "sensor.pool_status": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "pool_status", unique_id: "dev-a_pool-1_pool_status" },
        "sensor.drive_temperature": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "drive_temperature", unique_id: "dev-a_pool-1_sda_drive_temperature" },
        "switch.snapshots": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "snapshot_enabled", unique_id: "dev-a_snapshot_shared_main_enabled" },
        "select.fan": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "fan_mode", unique_id: "dev-a_fan_mode" },
        "button.shutdown": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "shutdown", unique_id: "dev-a_shutdown" },
        "update.unifi_os": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "unifi_os", unique_id: "dev-a_unifi_os_update" }
      };
      const card = document.createElement("unifi-drive-card");
      card.hass = {
        states,
        entities: registry,
        locale: { language: "en" },
        callService: async () => undefined
      };
      const baseConfig = {
        type: "custom:unifi-drive-card",
        name: "UniFi Drive",
        sections: ["overview", "pools", "drives", "snapshots", "system", "updates"],
        tap_action: { action: "more-info" },
        hold_action: { action: "navigate", navigation_path: "/lovelace/unifi-drive" },
        double_tap_action: { action: "toggle" }
      };
      window.__baseConfig = baseConfig;
      card.setConfig(baseConfig);
      document.body.append(card);
      await card.updateComplete;
      window.__cardReady = true;
    </script>
  </body>
</html>`;

const server = http.createServer((request, response) => {
  if (request.url === "/card.js") {
    response.writeHead(200, { "content-type": "text/javascript" });
    response.end(bundle);
    return;
  }
  response.writeHead(200, { "content-type": "text/html" });
  response.end(html);
});

await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", resolve);
});

let browser;
try {
  browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 720, deviceScaleFactor: 1 });
  const port = server.address().port;
  await page.goto(`http://127.0.0.1:${port}/`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForFunction(() => window.__cardReady === true, { timeout: 30000 });
  const result = await page.evaluate(async () => {
    const card = document.querySelector("unifi-drive-card");
    const root = card.shadowRoot;
    const actionDetails = [];
    document.body.addEventListener("hass-action", (event) => {
      actionDetails.push(event.detail);
    });
    const metric = root.querySelector(".metric.entity-action");
    metric.click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    metric.click();
    metric.click();
    await new Promise((resolve) => setTimeout(resolve, 300));
    metric.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      composed: true,
      isPrimary: true
    }));
    await new Promise((resolve) => setTimeout(resolve, 550));
    metric.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      composed: true,
      isPrimary: true
    }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    const text = root.innerText || root.textContent || "";
    const cardBox = root.querySelector(".unifi-card").getBoundingClientRect();
    const iconStyles = [...root.querySelectorAll(".icon-bubble")].map((element) => ({
      background: getComputedStyle(element).backgroundColor,
      color: getComputedStyle(element).color,
      className: element.className,
    }));
    return {
      actionDetails,
      text,
      cardBox: {
        width: cardBox.width,
        height: cardBox.height,
      },
      iconStyles,
      customCards: window.customCards,
      hasShutdownByDefault: text.includes("Shut down"),
      prefixStillVisible: /UniFi Drive Storage Usage/.test(text),
    };
  });

  if (screenshotPath) {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  }
  assert(result.customCards.some((item) => item.type === "unifi-drive-card"), "customCards metadata missing");
  assert(result.text.includes("UniFi Drive"), "card title missing");
  assert(result.text.includes("Pool 1"), "pool group missing");
  assert(result.text.includes("Disk 1"), "drive group missing");
  assert(result.text.includes("Shared"), "snapshot group missing");
  assert(result.text.includes("Install"), "update install control missing");
  assert(!result.hasShutdownByDefault, "dangerous shutdown action rendered by default");
  assert(!result.prefixStillVisible, "device prefix was not normalized");
  assert(result.cardBox.width > 400 && result.cardBox.height > 280, "card layout looks collapsed");
  assert(result.iconStyles.length >= 6, "expected icon bubbles were not rendered");
  assert(result.actionDetails.some((item) => item.action === "tap"), "tap action missing");
  assert(result.actionDetails.some((item) => item.action === "double_tap"), "double tap action missing");
  assert(result.actionDetails.some((item) => item.action === "hold"), "hold action missing");
  console.log("PASS: browser render smoke");
} finally {
  if (browser) {
    await browser.close();
  }
  await new Promise((resolve) => server.close(resolve));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
