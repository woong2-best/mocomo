/**
 * Replace `{ error: "…Hangul…" }` / `throw new Error("…Hangul…")` in src/actions
 * with catalog keys (no t() — server actions return keys). Reuses en.json; no [TODO].
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const hangul = /[가-힣]/;
const TODO_PREFIX = /^\[TODO(?: translate)?\]\s*/;
const enPath = path.join(process.cwd(), "src/lib/i18n/locales/en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

function loadKoEnIndex() {
  const p = path.join(process.cwd(), ".build-tmp/ko-en-index.json");
  if (!fs.existsSync(p)) return new Map();
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(p, "utf8"))));
  } catch {
    return new Map();
  }
}

const koEnIndex = loadKoEnIndex();

function slug(text) {
  return `s${crypto.createHash("sha1").update(text).digest("hex").slice(0, 10)}`;
}

function keyForKo(ko) {
  const normalized = ko.replace(/\s+/g, " ").trim();
  const idx = koEnIndex.get(ko) ?? koEnIndex.get(normalized);
  if (idx?.key && en[idx.key] && !hangul.test(String(en[idx.key])) && !TODO_PREFIX.test(String(en[idx.key]))) {
    return idx.key;
  }
  for (const [k, v] of Object.entries(en)) {
    if (v === ko || v === normalized) return k;
  }
  for (const [k, v] of Object.entries(en)) {
    if (typeof v !== "string") continue;
    if (TODO_PREFIX.test(v)) {
      const src = v.replace(TODO_PREFIX, "").trim();
      if (src === ko || src === normalized) return k;
    }
  }
  return null;
}

function ensureKey(ko, prefix) {
  const existing = keyForKo(ko);
  if (existing) return existing;

  const idx = koEnIndex.get(ko);
  let enText = idx?.en;
  if (!enText || hangul.test(enText) || TODO_PREFIX.test(enText)) {
    enText = provisionalEnglish(ko);
  }

  const key = `${prefix}.${slug(ko)}`;
  if (!(key in en)) en[key] = enText;
  koEnIndex.set(ko.replace(/\s+/g, " ").trim(), { key, en: en[key] });
  return key;
}

function provisionalEnglish(ko) {
  if (/로그인|인증/.test(ko)) return "Please sign in to continue.";
  if (/권한/.test(ko)) return "You don't have permission to do that.";
  if (/없/.test(ko)) return "Not found.";
  if (/실패|오류/.test(ko)) return "Something went wrong. Please try again.";
  return "Something went wrong. Please try again.";
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith(".ts")) files.push(p);
  }
  return files;
}

const actionDir = path.join(process.cwd(), "src/actions");
let fileCount = 0;
let replCount = 0;

for (const file of walk(actionDir)) {
  let src = fs.readFileSync(file, "utf8");
  const prefix = `actions.${path.basename(file, ".ts").replace(/[^a-z0-9]+/gi, "_")}`;
  let next = src;

  next = next.replace(/error:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g, (full, inner) => {
    const decoded = inner.replace(/\\"/g, '"');
    if (!hangul.test(decoded)) return full;
    const key = ensureKey(decoded, prefix);
    replCount++;
    return `error: "${key}"`;
  });

  next = next.replace(/throw new Error\("([^"\\]*(?:\\.[^"\\]*)*)"\)/g, (full, inner) => {
    const decoded = inner.replace(/\\"/g, '"');
    if (!hangul.test(decoded)) return full;
    const key = ensureKey(decoded, prefix);
    replCount++;
    return `throw new Error("${key}")`;
  });

  if (next !== src) {
    fs.writeFileSync(file, next, "utf8");
    fileCount++;
    console.log("updated", path.relative(process.cwd(), file));
  }
}

fs.writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`, "utf8");
console.log(`files=${fileCount} replacements=${replCount} en=${Object.keys(en).length}`);
