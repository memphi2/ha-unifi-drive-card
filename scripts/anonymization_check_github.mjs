#!/usr/bin/env node
const REPO = process.env.GH_REPO || process.env.GITHUB_REPOSITORY || "";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const REQUIRED = /^(1|true|yes)$/i.test(process.env.ANONYMIZATION_GITHUB_REQUIRED || "");
const API_VERSION = "2022-11-28";
const API_BASE = "https://api.github.com";
const PER_PAGE = clampInteger(process.env.ANONYMIZATION_GITHUB_PER_PAGE, 100, 1, 100);
const MAX_PAGES = clampInteger(process.env.ANONYMIZATION_GITHUB_MAX_PAGES, 10, 1, 50);
const MAX_ITEMS = clampInteger(process.env.ANONYMIZATION_GITHUB_MAX_ITEMS, 1000, 1, 10_000);

const PRIVATE_IPV4_PATTERN =
  /\b(?:10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|192\.168(?:\.\d{1,3}){2})\b/g;
const PRIVATE_FRAGMENT_PATTERN =
  /\b(?:172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}|192\.168\.\d{1,3})\b/g;

const BLOCKLIST_TERMS = parseBlocklist(
  process.env.ANONYMIZATION_BLOCKLIST_TERMS || process.env.ANONYMIZATION_BLOCKLIST || "",
);

const SECRET_ASSIGNMENT_PATTERN =
  /\b(?:password|passwd|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\b\s*[:=]\s*["'`]?([^"'`\s]{6,})["'`]?/gi;

const RAW_TOKEN_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
];

const ALLOWED_SECRET_VALUES = [
  /^<[^>]+>$/,
  /^\$\{?[A-Z0-9_]+\}?$/,
  /^\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}$/i,
  /^redacted$/i,
  /^changeme$/i,
  /^example$/i,
  /^placeholder$/i,
  /^masked$/i,
];

const failures = [];
const scannedCounters = new Map();

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  failures.push(message);
}

function maskSnippet(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return "<empty>";
  }
  if (value.length <= 8) {
    return `${value[0]}***${value[value.length - 1]}`;
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function maskPrivateIp(rawIp) {
  const parts = String(rawIp).split(".");
  if (parts.length !== 4) {
    return maskSnippet(rawIp);
  }
  return `${parts[0]}.${parts[1]}.x.x`;
}

function normalizeText(value) {
  return typeof value === "string" ? value : "";
}

function isAllowedSecretValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed.includes("*")) {
    return true;
  }
  return ALLOWED_SECRET_VALUES.some((pattern) => pattern.test(trimmed));
}

function recordCount(key, amount = 1) {
  scannedCounters.set(key, (scannedCounters.get(key) || 0) + amount);
}

function parseBlocklist(raw) {
  return String(raw)
    .split(/[,\n]/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function findAllIndices(content, term) {
  const positions = [];
  const haystack = content.toLowerCase();
  const needle = term.toLowerCase();
  let offset = 0;
  while (offset < haystack.length) {
    const index = haystack.indexOf(needle, offset);
    if (index === -1) {
      break;
    }
    positions.push(index);
    offset = index + needle.length;
  }
  return positions;
}

function scanText(context, text) {
  const content = normalizeText(text);
  if (!content) {
    return;
  }

  for (const match of content.matchAll(PRIVATE_IPV4_PATTERN)) {
    fail(`${context} includes private LAN address ${maskPrivateIp(match[0])}`);
  }

  for (const match of content.matchAll(PRIVATE_FRAGMENT_PATTERN)) {
    fail(`${context} includes private LAN fragment ${maskPrivateIp(match[0])}`);
  }

  for (const match of content.matchAll(SECRET_ASSIGNMENT_PATTERN)) {
    const value = match[1] || "";
    if (!isAllowedSecretValue(value)) {
      fail(`${context} includes literal secret-like assignment (${maskSnippet(value)})`);
    }
  }

  for (const pattern of RAW_TOKEN_PATTERNS) {
    for (const match of content.matchAll(pattern)) {
      fail(`${context} includes token/JWT-like literal (${maskSnippet(match[0])})`);
    }
  }

  for (const term of BLOCKLIST_TERMS) {
    const matches = findAllIndices(content, term);
    for (let index = 0; index < matches.length; index += 1) {
      fail(`${context} includes a blocklisted anonymization term`);
    }
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": API_VERSION,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${url}: ${body.slice(0, 240)}`);
  }
  return { data: await response.json(), link: response.headers.get("link") || "" };
}

function parseNextLink(linkHeader) {
  if (!linkHeader) {
    return "";
  }
  for (const part of linkHeader.split(",")) {
    const [urlPart, relPart] = part.split(";").map((segment) => segment.trim());
    if (!urlPart || !relPart) {
      continue;
    }
    if (relPart.includes('rel="next"')) {
      return urlPart.replace(/^<|>$/g, "");
    }
  }
  return "";
}

async function fetchPages(path) {
  const results = [];
  let nextUrl = `${API_BASE}/repos/${REPO}/${path}${path.includes("?") ? "&" : "?"}per_page=${PER_PAGE}`;
  let pageCount = 0;
  while (nextUrl && pageCount < MAX_PAGES && results.length < MAX_ITEMS) {
    pageCount += 1;
    const { data, link } = await fetchJson(nextUrl);
    const pageItems = Array.isArray(data) ? data : [];
    for (const item of pageItems) {
      results.push(item);
      if (results.length >= MAX_ITEMS) {
        break;
      }
    }
    nextUrl = parseNextLink(link);
  }
  return results;
}

async function scanRepositoryMetadata() {
  const { data } = await fetchJson(`${API_BASE}/repos/${REPO}`);
  recordCount("repository", 1);
  scanText("repo.description", data.description);
  scanText("repo.homepage", data.homepage);
}

async function scanReleases() {
  const releases = await fetchPages("releases");
  recordCount("releases", releases.length);
  for (const release of releases) {
    const id = release.tag_name || String(release.id || "unknown");
    scanText(`release(${id}).name`, release.name);
    scanText(`release(${id}).body`, release.body);
  }
}

async function scanIssuesAndPrBodies() {
  const issues = await fetchPages("issues?state=all");
  recordCount("issues_or_prs", issues.length);
  for (const issue of issues) {
    const number = issue.number;
    const kind = issue.pull_request ? "pr" : "issue";
    scanText(`${kind}#${number}.title`, issue.title);
    scanText(`${kind}#${number}.body`, issue.body);
  }
}

async function scanIssueComments() {
  const comments = await fetchPages("issues/comments");
  recordCount("issue_comments", comments.length);
  for (const comment of comments) {
    const id = comment.id || "unknown";
    scanText(`issue_comment#${id}`, comment.body);
  }
}

async function scanPrReviewComments() {
  const comments = await fetchPages("pulls/comments");
  recordCount("pr_review_comments", comments.length);
  for (const comment of comments) {
    const id = comment.id || "unknown";
    scanText(`pr_review_comment#${id}`, comment.body);
  }
}

async function scanRecentCommitMessages() {
  const commits = await fetchPages("commits");
  recordCount("commits", commits.length);
  for (const commit of commits) {
    const sha = String(commit.sha || "").slice(0, 8);
    const message = commit?.commit?.message;
    scanText(`commit(${sha}).message`, message);
  }
}

if (!REPO) {
  if (REQUIRED) {
    fail("GH_REPO or GITHUB_REPOSITORY is required for GitHub anonymization check");
  } else {
    pass("GitHub anonymization check skipped (repo not configured)");
  }
}

if (!TOKEN) {
  if (REQUIRED) {
    fail("GITHUB_TOKEN or GH_TOKEN is required for GitHub anonymization check");
  } else {
    pass("GitHub anonymization check skipped (token not configured)");
  }
}

if (REPO && TOKEN) {
  try {
    await scanRepositoryMetadata();
    await scanReleases();
    await scanIssuesAndPrBodies();
    await scanIssueComments();
    await scanPrReviewComments();
    await scanRecentCommitMessages();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

if (failures.length) {
  for (const message of failures) {
    console.error(`FAIL: ${message}`);
  }
  process.exitCode = 1;
} else if (REPO && TOKEN) {
  const counterSummary = [...scannedCounters.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
  pass(`GitHub anonymization scan passed for ${REPO} (${counterSummary})`);
}
