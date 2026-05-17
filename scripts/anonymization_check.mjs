#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", ".vite", "coverage", "dist", "node_modules"]);
const SKIP_FILES = new Set(["package-lock.json"]);
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".js",
  ".mjs",
  ".md",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

const PRIVATE_IPV4_PATTERN =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g;

const SECRET_ASSIGNMENT_PATTERNS = [
  /\b(?:password|passwd|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\b\s*[:=]\s*["']([^"']{4,})["']/gi,
  /\b[A-Z0-9_]*(?:PASSWORD|PASSWD|TOKEN|SECRET|API_KEY)[A-Z0-9_]*\s*=\s*["']([^"']{4,})["']/g,
];

const ALLOWED_SECRET_VALUES = [
  /^<[^>]+>$/,
  /^\$\{?[A-Z0-9_]+\}?$/,
  /^redacted$/i,
  /^changeme$/i,
  /^example$/i,
  /^placeholder$/i,
  /^http:\/\/localhost\/?$/i,
];

const findings = [];

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function shouldScan(file) {
  if (SKIP_FILES.has(path.basename(file))) {
    return false;
  }
  return TEXT_EXTENSIONS.has(path.extname(file));
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        files.push(...(await walk(fullPath)));
      }
      continue;
    }
    if (entry.isFile() && shouldScan(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function lineFor(content, index) {
  return content.slice(0, index).split("\n").length;
}

function allowedSecretValue(value) {
  const trimmed = value.trim();
  return ALLOWED_SECRET_VALUES.some((pattern) => pattern.test(trimmed));
}

function checkFile(file, content) {
  for (const match of content.matchAll(PRIVATE_IPV4_PATTERN)) {
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      reason: "private LAN address must be replaced by an env var or placeholder",
    });
  }

  for (const pattern of SECRET_ASSIGNMENT_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      const value = match[1] ?? "";
      if (!allowedSecretValue(value)) {
        findings.push({
          file,
          line: lineFor(content, match.index ?? 0),
          reason: "literal secret-like value must be replaced by an env var or placeholder",
        });
      }
    }
  }
}

const files = await walk(ROOT);
for (const file of files) {
  const metadata = await stat(file);
  if (metadata.size > 750_000) {
    continue;
  }
  checkFile(relative(file), await readFile(file, "utf8"));
}

if (findings.length) {
  for (const finding of findings) {
    fail(`${finding.file}:${finding.line} ${finding.reason}`);
  }
} else {
  pass(`anonymization scan covered ${files.length} text files`);
}
