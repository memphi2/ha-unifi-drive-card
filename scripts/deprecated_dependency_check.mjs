#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const deprecated = Object.entries(lock.packages)
  .filter(([name, pkg]) => name && typeof pkg.deprecated === "string" && pkg.deprecated.trim())
  .map(([name, pkg]) => `${name}@${pkg.version}: ${pkg.deprecated.trim()}`);
if (deprecated.length) {
  console.error(`FAIL: deprecated locked dependencies:\n${deprecated.sort().join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("PASS: no deprecated packages recorded in the lockfile");
}
