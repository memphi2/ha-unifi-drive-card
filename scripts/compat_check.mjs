#!/usr/bin/env node
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const HACS_FILE = "hacs.json";
const PACKAGE_FILE = "package.json";
const DIST_DIR = "dist";
const EXPECTED_REPOSITORY = "ha-unifi-drive-card";
const EXPECTED_CARD_TYPE = "unifi-drive-card";
const EXPECTED_CUSTOM_ELEMENT = "unifi-drive-card";
const EXPECTED_EDITOR_ELEMENT = "unifi-drive-card-editor";
const EXPECTED_DISPLAY_NAME = "Unifi Drive / UNAS Card";
const MARKETPLACE_BUTTON =
  "https://my.home-assistant.io/redirect/marketplace_repository/?owner=memphi2&repository=ha-unifi-drive-card&category=plugin";

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function fileExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function checkHacs() {
  const hacs = await readJson(HACS_FILE);
  const filename = hacs.filename;
  if (typeof filename !== "string" || !filename.endsWith(".js")) {
    fail("hacs.json filename must be a JavaScript file name");
    return undefined;
  }
  if (filename.includes("/") || filename.includes("\\")) {
    fail("hacs.json filename must be a file name, not a path");
  } else {
    pass("hacs filename is path-free");
  }
  if (filename !== `${EXPECTED_REPOSITORY}.js`) {
    fail(`hacs filename should match repository asset ${EXPECTED_REPOSITORY}.js`);
  } else {
    pass("hacs filename matches repository asset name");
  }
  if (hacs.name !== EXPECTED_DISPLAY_NAME) {
    fail(`hacs display name must be ${EXPECTED_DISPLAY_NAME}`);
  } else {
    pass("hacs display name matches Marketplace branding");
  }
  const { minimum } = await readJson("test/fixtures/ha-frontends.json");
  if (hacs.homeassistant !== minimum.homeassistant) {
    fail("hacs minimum Home Assistant must match the tested frontend baseline");
  } else {
    pass(`minimum Home Assistant ${hacs.homeassistant} matches tested baseline`);
  }
  return filename;
}

async function checkMarketplaceDocumentation() {
  const readme = await readFile("README.md", "utf8");
  const installation = await readFile("docs/installation.md", "utf8");
  for (const [name, document] of [["README", readme], ["installation guide", installation]]) {
    if (!document.includes(MARKETPLACE_BUTTON)) {
      fail(`${name} is missing the Marketplace installation button`);
    } else {
      pass(`${name} links to the Marketplace installation button`);
    }
  }
}

async function checkPackage() {
  const pkg = await readJson(PACKAGE_FILE);
  if (pkg.name !== EXPECTED_REPOSITORY) {
    fail(`package name must be ${EXPECTED_REPOSITORY}`);
  } else {
    pass("package name matches repository");
  }
  if (pkg.type !== "module") {
    fail("package must be an ES module package");
  } else {
    pass("package is ESM");
  }
}

async function checkBundle(filename) {
  if (!filename) {
    return;
  }
  const bundlePath = path.join(DIST_DIR, filename);
  const sourceMapPath = `${bundlePath}.map`;
  const bundle = await readFile(bundlePath, "utf8");
  const bundleStat = await stat(bundlePath);
  if (bundleStat.size <= 0) {
    fail("bundle is empty");
  } else {
    pass(`bundle exists (${Math.round(bundleStat.size / 1024)} KiB)`);
  }
  for (const expected of [
    EXPECTED_CUSTOM_ELEMENT,
    EXPECTED_EDITOR_ELEMENT,
    EXPECTED_CARD_TYPE,
    "window.customCards",
  ]) {
    if (!bundle.includes(expected)) {
      fail(`bundle does not contain ${expected}`);
    } else {
      pass(`bundle contains ${expected}`);
    }
  }
  if (!(await fileExists(sourceMapPath))) {
    fail("bundle sourcemap is missing");
  } else {
    pass("bundle sourcemap exists");
    const map = JSON.parse(await readFile(sourceMapPath, "utf8"));
    if (
      map.version !== 3 || map.file !== filename ||
      !Array.isArray(map.sources) || !map.sources.length ||
      !Array.isArray(map.sourcesContent) || map.sourcesContent.length !== map.sources.length ||
      !map.sources.every((source) => typeof source === "string" && !/^(?:\/|[a-zA-Z]:[\\/])/.test(source)) ||
      !map.sourcesContent.every((source) => typeof source === "string") ||
      typeof map.mappings !== "string" || !map.mappings ||
      !bundle.includes(`sourceMappingURL=${filename}.map`)
    ) {
      fail("bundle sourcemap is invalid or contains absolute source paths");
    } else {
      pass("bundle sourcemap is valid, linked and free of absolute source paths");
    }
  }
}

try {
  const filename = await checkHacs();
  await checkPackage();
  await checkBundle(filename);
  await checkMarketplaceDocumentation();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
