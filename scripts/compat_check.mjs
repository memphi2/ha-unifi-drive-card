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
  return filename;
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
  }
}

try {
  const filename = await checkHacs();
  await checkPackage();
  await checkBundle(filename);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
