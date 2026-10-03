/**
 * Fails when Hangul appears in the mobile app source.
 *
 *   npm run check:i18n            (from apps/mobile)
 *
 * Scope: everything the app ships or builds from (src, App.tsx, index.ts, app.json,
 * plugins, local native modules, scripts). Comments are checked too.
 *
 * Excluded:
 *  - node_modules, generated native projects (android/ios), build output, .expo, dist
 *  - archive/ (repo root, outside apps/mobile) and any other repo-level archive folders
 *  - src/data/server-values/**  -> values that must match Korean data already stored on the
 *    server or written by users (region names stored on listings, legacy chat message
 *    templates, hashtag filters). They are identifiers / user data, never UI copy.
 *    See docs/mobile-i18n-decisions.md.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/;

function lineHasHangul(line) {
  if (HANGUL.test(line)) return true;
  // Regex character-class ranges (`\uAC00-\uD7AF`) are not Hangul copy.
  const withoutRanges = line.replace(/\\u[0-9A-Fa-f]{4}-\\u[0-9A-Fa-f]{4}/gi, "");
  const decoded = withoutRanges.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return decoded !== withoutRanges && HANGUL.test(decoded);
}

const SCAN_ENTRIES = [
  "src",
  "App.tsx",
  "index.ts",
  "app.json",
  "eas.json",
  "plugins",
  "modules",
  "scripts",
];

const SKIP_DIRS = new Set([
  "node_modules",
  "android",
  "ios",
  "build",
  "dist",
  ".expo",
  ".gradle",
  ".cxx",
  "archive",
]);

/** Paths relative to apps/mobile, forward slashes. Prefix match. */
const ALLOWED_PREFIXES = [
  "src/data/server-values/",
];

/** This script itself and the Hangul-range literals it needs. */
const ALLOWED_FILES = new Set(["scripts/check-no-hangul.cjs"]);

const SCAN_EXT = /\.(tsx?|jsx?|cjs|mjs|json|kt|java|xml|gradle|plist)$/i;

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function isAllowed(relPath) {
  if (ALLOWED_FILES.has(relPath)) return true;
  return ALLOWED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function walk(entry, out) {
  const abs = path.join(ROOT, entry);
  if (!fs.existsSync(abs)) return;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    out.push(abs);
    return;
  }
  for (const dirent of fs.readdirSync(abs, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      if (SKIP_DIRS.has(dirent.name)) continue;
      walk(path.join(entry, dirent.name), out);
    } else if (SCAN_EXT.test(dirent.name)) {
      out.push(path.join(abs, dirent.name));
    }
  }
}

const files = [];
for (const entry of SCAN_ENTRIES) walk(entry, files);

const offenders = [];
let totalLines = 0;
for (const file of files) {
  const relPath = rel(file);
  if (isAllowed(relPath)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    if (lineHasHangul(line)) hits.push(i + 1);
  });
  if (hits.length) {
    offenders.push({ file: relPath, hits });
    totalLines += hits.length;
  }
}

if (offenders.length === 0) {
  console.log(`check:i18n OK — no Hangul in ${files.length} scanned files.`);
  process.exit(0);
}

offenders.sort((a, b) => b.hits.length - a.hits.length || a.file.localeCompare(b.file));
console.error(`check:i18n FAILED — Hangul on ${totalLines} lines in ${offenders.length} files:\n`);
for (const { file, hits } of offenders.slice(0, 60)) {
  const preview = hits.slice(0, 6).join(", ") + (hits.length > 6 ? ", …" : "");
  console.error(`  ${String(hits.length).padStart(4)}  ${file}:${preview}`);
}
if (offenders.length > 60) console.error(`  … and ${offenders.length - 60} more files`);
console.error(
  "\nUse t('key') with the English text in src/i18n/en.json. " +
    "Server-stored Korean identifiers belong in src/data/server-values/ (see docs/mobile-i18n-decisions.md)."
);
process.exit(1);
