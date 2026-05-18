#!/usr/bin/env node
/* global document, getComputedStyle, PointerEvent, requestAnimationFrame, window */
import http from "node:http";
import { readFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const chromePath = process.env.CHROME_BIN || "/usr/bin/google-chrome";
const args = process.argv.slice(2);
const screenshotIndex = args.indexOf("--screenshot");
const screenshotPath = screenshotIndex >= 0 ? args[screenshotIndex + 1] : undefined;
const screenshotCardWidth = 420;
const screenshotClipHeight = 430;
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
        },
        "update.drive": {
          state: "off",
          attributes: {
            friendly_name: "Drive Update",
            installed_version: "3.0.0",
            latest_version: "3.0.0"
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
        "update.unifi_os": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "unifi_os", unique_id: "dev-a_unifi_os_update" },
        "update.drive": { platform: "unifi_drive", device_id: "dev-a", config_entry_id: "entry-a", translation_key: "drive", unique_id: "dev-a_drive_update" }
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
        name: "Drive Storage",
        compact: true,
        sections: ["overview", "storage", "pools", "drives", "snapshots", "system", "updates"],
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
  await page.setViewport({ width: 1180, height: 760, deviceScaleFactor: 1 });
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
    const waitForLayout = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const gridColumnCount = (element) =>
      getComputedStyle(element).gridTemplateColumns
        .split(" ")
        .map((item) => item.trim())
        .filter(Boolean).length;
    card.style.width = "320px";
    await waitForLayout();
    const narrowMetricColumnCount = gridColumnCount(root.querySelector(".metric-grid"));
    card.style.width = "520px";
    await waitForLayout();
    const narrowColumnCount = gridColumnCount(root.querySelector(".content-grid"));
    card.style.width = "720px";
    card.setConfig({
      ...window.__baseConfig,
      overview_columns: 4
    });
    await card.updateComplete;
    await waitForLayout();
    const configuredMetricColumnCount = gridColumnCount(root.querySelector(".metric-grid"));
    card.setConfig(window.__baseConfig);
    await card.updateComplete;
    await waitForLayout();
    const defaultMetricColumnCount = gridColumnCount(root.querySelector(".metric-grid"));
    card.style.width = "980px";
    card.setConfig({
      ...window.__baseConfig,
      sections: ["storage", "system", "pools"]
    });
    await card.updateComplete;
    await waitForLayout();
    const wideColumnCount = gridColumnCount(root.querySelector(".content-grid"));
    const wideEntityColumnCount = gridColumnCount(root.querySelector(".entity-list"));
    const sectionRect = (selector) => {
      const box = root.querySelector(selector).getBoundingClientRect();
      return { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width) };
    };
    const wideSections = {
      storage: sectionRect('[data-section="storage"]'),
      system: sectionRect('[data-section="system"]'),
      pools: sectionRect('[data-section="pools"]'),
    };
    card.setConfig({
      ...window.__baseConfig,
      sections: ["storage"],
      show_display_buttons: true
    });
    await card.updateComplete;
    await waitForLayout();
    const displayTileCount = root.querySelectorAll(".display-button-tile").length;
    card.setConfig(window.__baseConfig);
    await card.updateComplete;
    await waitForLayout();
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
    const installButtons = [...root.querySelectorAll("button.chip")]
      .filter((element) => element.textContent.trim() === "Install")
      .map((element) => ({ disabled: element.disabled }));
    const problemIconClass = [...root.querySelectorAll(".metric")]
      .find((element) => element.textContent.includes("Problem"))
      ?.querySelector(".icon-bubble")
      ?.className;
    const animatedIconCount = root.querySelectorAll(".icon-bubble.animated").length;
    return {
      actionDetails,
      text,
      isCompact: root.querySelector("ha-card")?.classList.contains("compact") === true,
      cardBox: {
        width: cardBox.width,
        height: cardBox.height,
      },
      iconStyles,
      customCards: window.customCards,
      hasShutdownByDefault: text.includes("Shut down"),
      prefixStillVisible: /UniFi Drive Storage Usage/.test(text),
      installButtons,
      problemIconClass,
      animatedIconCount,
      layout: {
        narrowColumnCount,
        wideColumnCount,
        wideEntityColumnCount,
        narrowMetricColumnCount,
        defaultMetricColumnCount,
        configuredMetricColumnCount,
        displayTileCount,
        wideSections,
      },
    };
  });

  if (screenshotPath) {
    await page.setViewport({
      width: screenshotCardWidth + 48,
      height: screenshotClipHeight + 80,
      deviceScaleFactor: 1,
    });
    await page.evaluate(
      async (width) => {
        const card = document.querySelector("unifi-drive-card");
        card.style.width = `${width}px`;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      },
      screenshotCardWidth,
    );
    const cardBox = await (await page.$("unifi-drive-card"))?.boundingBox();
    if (!cardBox) {
      throw new Error("card screenshot target missing");
    }
    await page.screenshot({
      path: screenshotPath,
      clip: {
        x: Math.max(0, Math.floor(cardBox.x)),
        y: Math.max(0, Math.floor(cardBox.y)),
        width: Math.ceil(cardBox.width),
        height: Math.min(Math.ceil(cardBox.height), screenshotClipHeight),
      },
    });
  }
  assert(result.customCards.some((item) => item.type === "unifi-drive-card"), "customCards metadata missing");
  assert(result.isCompact, "render smoke fixture is not in compact mode");
  assert(result.text.includes("Drive Storage"), "card title missing");
  assert(result.text.includes("Pool 1"), "pool group missing");
  assert(result.text.includes("Disk 1"), "drive group missing");
  assert(result.text.includes("Shared"), "snapshot group missing");
  assert(result.text.includes("Drive Update"), "Drive update label was over-normalized");
  assert(result.text.includes("Install"), "update install control missing");
  assert(result.installButtons.length === 2, "expected two update install controls");
  assert(result.installButtons.some((item) => item.disabled === false), "available update install control missing");
  assert(result.installButtons.some((item) => item.disabled === true), "non-available update install control was not disabled");
  assert(result.problemIconClass?.includes("ok"), "healthy problem entity did not render green");
  assert(!result.problemIconClass?.includes("alert"), "healthy problem entity rendered as alert");
  assert(
    result.animatedIconCount > 0 && result.animatedIconCount < result.iconStyles.length,
    "icon animations were not limited to active or attention states",
  );
  assert(!result.hasShutdownByDefault, "dangerous shutdown action rendered by default");
  assert(!result.prefixStillVisible, "device prefix was not normalized");
  assert(result.cardBox.width > 400 && result.cardBox.height > 280, "card layout looks collapsed");
  assert(result.layout.narrowColumnCount === 1, "narrow dashboard width did not use single-column layout");
  assert(result.layout.wideColumnCount >= 2, "wide dashboard width did not use multi-column layout");
  assert(
    result.layout.narrowMetricColumnCount === 1,
    `narrow overview did not collapse to one column (${result.layout.narrowMetricColumnCount})`,
  );
  assert(
    result.layout.defaultMetricColumnCount === 3,
    `default overview did not use three columns (${result.layout.defaultMetricColumnCount})`,
  );
  assert(
    result.layout.configuredMetricColumnCount === 4,
    `configured overview columns were ignored (${result.layout.configuredMetricColumnCount})`,
  );
  assert(
    result.layout.wideEntityColumnCount >= 2,
    `wide entity rows did not flow horizontally (${result.layout.wideEntityColumnCount} columns)`,
  );
  assert(
    result.layout.displayTileCount >= 2,
    `display tile layout did not render (${result.layout.displayTileCount} tiles)`,
  );
  assert(
    Math.abs(result.layout.wideSections.storage.top - result.layout.wideSections.system.top) <= 2,
    "wide dashboard width did not place storage and system blocks on the same row",
  );
  assert(
    result.layout.wideSections.system.top < result.layout.wideSections.pools.top,
    "wide dashboard width did not preserve configured section order",
  );
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
