#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const REQUIRED_PROJECT_LICENSE = "MIT";
const RUNTIME_NOTICE_PACKAGES = [
  "lit",
  "lit-element",
  "lit-html",
  "@lit/reactive-element",
];

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

const pkg = await readJson("package.json");
const notices = await readFile("THIRD_PARTY_NOTICES.md", "utf8");

if (pkg.license !== REQUIRED_PROJECT_LICENSE) {
  fail(`package.json license must be ${REQUIRED_PROJECT_LICENSE}`);
} else {
  pass("project license is declared");
}

for (const packageName of RUNTIME_NOTICE_PACKAGES) {
  const dependencyPath = `node_modules/${packageName}/package.json`;
  const dependency = await readJson(dependencyPath);
  if (dependency.license !== "BSD-3-Clause") {
    fail(`${packageName} license changed from BSD-3-Clause to ${dependency.license}`);
    continue;
  }
  if (!notices.includes(packageName)) {
    fail(`THIRD_PARTY_NOTICES.md is missing ${packageName}`);
  } else {
    pass(`${packageName} notice is present`);
  }
}

if (!notices.includes("BSD 3-Clause License") || !notices.includes("Google LLC")) {
  fail("THIRD_PARTY_NOTICES.md is missing the Lit BSD 3-Clause license text");
} else {
  pass("Lit BSD 3-Clause license text is present");
}
