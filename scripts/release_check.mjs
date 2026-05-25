#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const EXPECTED_FILENAME = "ha-unifi-drive-card.js";
const failures = [];

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  failures.push(message);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function requireIncludes(file, content, expected, message) {
  if (content.includes(expected)) {
    pass(message);
  } else {
    fail(`${file} is missing ${expected}`);
  }
}

const pkg = await readJson("package.json");
const lock = await readJson("package-lock.json");
const EXPECTED_VERSION = pkg.version;
const EXPECTED_TAG = `v${EXPECTED_VERSION}`;
const hacs = await readJson("hacs.json");
const changelog = await readFile("CHANGELOG.md", "utf8");
const releaseNotesPath = `release-notes/${EXPECTED_TAG}.md`;
const releaseNotes = await readFile(releaseNotesPath, "utf8");
const releaseWorkflow = await readFile(".github/workflows/release.yml", "utf8");
const legal = await readFile("docs/legal.md", "utf8");
const readme = await readFile("README.md", "utf8");
const notices = await readFile("THIRD_PARTY_NOTICES.md", "utf8");

if (pkg.version === EXPECTED_VERSION && lock.version === EXPECTED_VERSION) {
  pass(`package and lockfile versions match ${EXPECTED_VERSION}`);
} else {
  fail("package.json and package-lock.json must both be release version");
}

if (pkg.license === "MIT" && notices.includes("BSD 3-Clause License")) {
  pass("project license and bundled runtime notice are present");
} else {
  fail("license metadata or third-party notices are incomplete");
}

if (typeof pkg.repository?.url === "string" && typeof pkg.bugs?.url === "string") {
  pass("package repository and issue URLs are present");
} else {
  fail("package repository and bugs URLs are required for release");
}

if (hacs.filename === EXPECTED_FILENAME && hacs.name === "Drive Storage Card") {
  pass("HACS metadata is release-ready");
} else {
  fail("hacs.json must use the stable bundle filename and trademark-neutral display name");
}

requireIncludes("CHANGELOG.md", changelog, `## ${EXPECTED_VERSION} -`, "changelog has dated release entry");
requireIncludes(releaseNotesPath, releaseNotes, `# Drive Storage Card ${EXPECTED_VERSION}`, "release notes exist");
requireIncludes(releaseNotesPath, releaseNotes, "Built with Codex", "release notes credit Codex");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, `body_path: release-notes/${"${{ github.ref_name }}.md"}`, "release workflow uses tag-specific notes");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, EXPECTED_FILENAME, "release workflow uploads JS asset");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, `${EXPECTED_FILENAME}.map`, "release workflow uploads sourcemap asset");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, "ha-unifi-drive-card.zip", "release workflow uploads ZIP asset");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, "issues: read", "release workflow can read issues for anonymization scan");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, "pull-requests: read", "release workflow can read PRs for anonymization scan");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, "npm run anonymization-check:github", "release workflow runs GitHub anonymization scan");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, "ANONYMIZATION_GITHUB_REQUIRED", "release workflow enforces GitHub anonymization scan");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, "ANONYMIZATION_BLOCKLIST_TERMS: ${{ secrets.ANONYMIZATION_BLOCKLIST_TERMS }}", "release workflow forwards optional anonymization blocklist secret");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, "GH_REPO: ${{ github.repository }}", "release workflow sets repository for anonymization scan");
requireIncludes(".github/workflows/release.yml", releaseWorkflow, "GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}", "release workflow injects GitHub token for anonymization scan");
requireIncludes("docs/legal.md", legal, "affiliated with, sponsored by or endorsed", "legal disclaimer is present");
requireIncludes("docs/legal.md", legal, "does not include Ubiquiti, UniFi, Home Assistant or HACS logos", "logo/trade-dress statement is present");
requireIncludes("README.md", readme, "## Trademark Notice", "README trademark notice is present");

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL: ${failure}`);
  }
  process.exitCode = 1;
} else {
  pass(`${EXPECTED_TAG} release metadata is ready`);
}
