#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const exec = promisify(execFile);
const filename = "ha-unifi-drive-card.js";
const expected = [filename, `${filename}.map`];
const archive = process.argv[2] ?? "release/ha-unifi-drive-card.zip";
const { stdout } = await exec("unzip", ["-Z1", archive]);
const members = stdout.trim().split(/\r?\n/);
assert.deepEqual(members.toSorted(), expected.toSorted(), "ZIP must contain exactly the bundle and map");
for (const member of members) {
  const { stdout: bytes } = await exec("unzip", ["-p", archive, member], {
    encoding: "buffer", maxBuffer: 16 * 1024 * 1024,
  });
  assert(bytes.equals(await readFile(path.join("dist", member))), `ZIP differs from build: ${member}`);
}
const map = JSON.parse(await readFile(`dist/${filename}.map`, "utf8"));
assert.equal(map.version, 3);
assert.equal(map.file, filename);
assert(map.sources.length > 0 && map.sources.length === map.sourcesContent.length);
assert(map.sources.every((source) => !/^(?:\/|[a-zA-Z]:[\\/])/.test(source)),
  "Source map contains absolute paths");
assert((await readFile(`dist/${filename}`, "utf8")).includes(`sourceMappingURL=${filename}.map`));
console.log("PASS: release ZIP matches build and source map");
