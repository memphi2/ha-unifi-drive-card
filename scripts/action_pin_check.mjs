#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const WORKFLOWS_DIR = ".github/workflows";
// Any spelling GitHub honours for a "uses" key: block style, a quoted key, an
// extra space before the colon, or a flow mapping where uses is not first.
const USES_BLOCK_KEY = /^(?:-\s+)?\{?\s*["']?uses["']?\s*:/;
const USES_FLOW_KEY = /[{,]\s*["']?uses["']?\s*:/;
const USES_VALUE = /["']?uses["']?\s*:\s*["']?([^\s,}"']+)/g;
// Local and container actions are referenced by path or image, never by SHA.
const UNPINNABLE_PREFIXES = ["./", "../", ".\\", "docker://"];
// The one spelling this audit reads in full, because only here can it tell
// which release a SHA belongs to. Anything else is reported, never skipped.
const CANONICAL_USES =
  /^\s*(?:-\s+)?uses:\s*([^@\s]+)@(\S+)(?:\s+#\s*(\S+).*)?$/;
const ACTION_SHA = /^[0-9a-f]{40}$/;
// A SHA says nothing about which release it is, so the trailing comment has to
// name one: a v-prefixed release, optionally with a prerelease or build suffix
// such as v2.0.0-beta.1, or one of the two branch names actually pinned from
// here. Keeping the branch side an allow-list rather than "any name" is what
// stops the label from degenerating into free text.
const ACTION_VERSION =
  /^(?:v\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.-]+)?|main|master)$/;

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

// Prose and run-step text are not keys, so a match is tied to a position a key
// can occupy: the start of a block entry, or after `{` or `,` inside a flow
// mapping on the same line.
function declaresUsesKey(line) {
  const stripped = line.replace(/^\s+/, "");
  if (stripped.startsWith("#")) return false;
  if (USES_BLOCK_KEY.test(stripped)) return true;
  return line.includes("{") && USES_FLOW_KEY.test(line);
}

const entries = await readdir(WORKFLOWS_DIR);
// Every workflow file, so one added later is audited as well.
const workflows = entries
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();

if (workflows.length === 0) {
  fail(`no workflow files found under ${WORKFLOWS_DIR}`);
}

let audited = 0;
for (const name of workflows) {
  const text = await readFile(path.join(WORKFLOWS_DIR, name), "utf8");
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!declaresUsesKey(line)) continue;
    const values = [...line.matchAll(USES_VALUE)].map((match) => match[1]);
    if (
      values.length > 0 &&
      values.every((value) =>
        UNPINNABLE_PREFIXES.some((prefix) => value.startsWith(prefix)),
      )
    ) {
      continue;
    }
    const where = `${name}:${index + 1}`;
    const match = CANONICAL_USES.exec(line);
    if (match === null) {
      fail(
        `${where}: write this as 'uses: <action>@<sha> # <version>' so the pin ` +
          `audit can read it: ${line.trim()}`,
      );
      continue;
    }
    const [, action, ref, comment] = match;
    if (!ACTION_SHA.test(ref)) {
      fail(`${where}: ${action}@${ref} is not a commit SHA`);
      continue;
    }
    if (comment === undefined || !ACTION_VERSION.test(comment)) {
      fail(
        `${where}: ${action} is pinned to ${ref.slice(0, 12)} without a ` +
          `readable '# <version>' comment, so the pin cannot be traced to a release`,
      );
      continue;
    }
    audited += 1;
  }
}

if (process.exitCode !== 1) {
  pass(
    `${audited} action references pinned to a labelled commit SHA across ` +
      `${workflows.length} workflow files`,
  );
}
