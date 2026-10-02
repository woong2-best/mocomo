/**
 * Bulk-replace Hangul string literals / JSX text in a folder with t("prefix.key").
 * English copy: reuse en.json by Korean source text; never write [TODO translate].
 *
 * Usage: node scripts/i18n/migrate-folder-hangul.mjs <src-folder> <keyPrefix>
 * Example: node scripts/i18n/migrate-folder-hangul.mjs src/components/live live
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const targetRel = process.argv[2];
const keyPrefix = process.argv[3] || "ui";
if (!targetRel) {
  console.error("Usage: migrate-folder-hangul.mjs <folder> [keyPrefix]");
  process.exit(1);
}

const targetDir = path.join(root, targetRel);
const enPath = path.join(root, "src/lib/i18n/locales/en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const hangul = /[가-힣]/;

function gitUtf8File(ref) {
  try {
    const buf = execSync(`git show ${ref}`, {
      encoding: "buffer",
      maxBuffer: 50 * 1024 * 1024,
    });
    return buf.toString("utf8").replace(/^\uFEFF/, "");
  } catch {
    return null;
  }
}

function loadKoMap() {
  const koRaw = gitUtf8File("main:src/lib/i18n/locales/ko.json");
  if (!koRaw) return new Map();
  let ko;
  try {
    ko = JSON.parse(koRaw);
  } catch {
    return new Map();
  }
  const mainEnRaw = gitUtf8File("main:src/lib/i18n/locales/en.json");
  let mainEn = en;
  if (mainEnRaw) {
    try {
      mainEn = JSON.parse(mainEnRaw);
    } catch {
      mainEn = en;
    }
  }
  const byKo = new Map();
  for (const [key, koVal] of Object.entries(ko)) {
    const enVal = en[key] ?? mainEn[key];
    if (koVal && enVal && hangul.test(koVal)) {
      byKo.set(koVal, { key, en: enVal });
    }
  }
  return byKo;
}

const koLookup = loadKoMap();
const TODO_PREFIX = /^\[TODO(?: translate)?\]\s*/;

function loadKoEnIndex() {
  const p = path.join(root, ".build-tmp/ko-en-index.json");
  if (!fs.existsSync(p)) return new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    return new Map(Object.entries(raw).map(([ko, v]) => [ko, v]));
  } catch {
    return new Map();
  }
}

const koEnIndex = loadKoEnIndex();

/** Korean source text → catalog key (reuse only). */
function keyForKoSource(koText) {
  const normalized = koText.replace(/\s+/g, " ").trim();
  const idx = koEnIndex.get(koText) ?? koEnIndex.get(normalized);
  if (idx?.key && en[idx.key] && !hangul.test(String(en[idx.key])) && !TODO_PREFIX.test(String(en[idx.key]))) {
    return idx.key;
  }
  const hit = koLookup.get(koText) ?? koLookup.get(normalized);
  if (hit?.key && en[hit.key] && !hangul.test(String(en[hit.key])) && !TODO_PREFIX.test(String(en[hit.key]))) {
    return hit.key;
  }
  for (const [k, v] of Object.entries(en)) {
    if (v === koText || v === normalized) return k;
  }
  for (const [k, v] of Object.entries(en)) {
    if (typeof v !== "string") continue;
    if (TODO_PREFIX.test(v)) {
      const src = v.replace(TODO_PREFIX, "").trim();
      if (src === normalized || src === koText) return k;
    }
  }
  return null;
}

function englishForKo(koText) {
  const normalized = koText.replace(/\s+/g, " ").trim();
  const idx = koEnIndex.get(koText) ?? koEnIndex.get(normalized);
  if (idx?.en && !hangul.test(idx.en) && !TODO_PREFIX.test(idx.en)) return idx.en;
  const hit = koLookup.get(koText) ?? koLookup.get(normalized);
  if (hit?.en && !hangul.test(hit.en) && !TODO_PREFIX.test(hit.en)) return hit.en;
  return null;
}

function slug(text) {
  const base = text
    .replace(/[가-힣]+/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join("_")
    .toLowerCase();
  if (base.length >= 3) return base.slice(0, 40);
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return `s${h.toString(36).slice(0, 8)}`;
}

function ensureEntry(koText) {
  const existing = keyForKoSource(koText);
  if (existing) return existing;

  let enText = englishForKo(koText);
  if (!enText) {
    enText = provisionalEnglish(koText);
  }
  if (hangul.test(enText) || TODO_PREFIX.test(enText)) {
    throw new Error(
      `No en.json match for Korean string; add to catalog first: ${koText.slice(0, 60)}…`
    );
  }

  let base = `${keyPrefix}.${slug(koText) || "text"}`;
  let key = base;
  let n = 2;
  while (key in en && en[key] !== enText) {
    key = `${base}_${n++}`;
  }
  if (!(key in en)) en[key] = enText;
  else if (hangul.test(String(en[key])) || TODO_PREFIX.test(String(en[key]))) {
    en[key] = enText;
  }
  koEnIndex.set(koText.replace(/\s+/g, " ").trim(), { key, en: enText });
  return key;
}

/** Short UI/error copy when index has no row (Latin only, no placeholders). */
function provisionalEnglish(ko) {
  const rules = [
    [/실패|오류|에러/, "Something went wrong. Please try again."],
    [/로그인|인증/, "Please sign in to continue."],
    [/권한|허용/, "You don't have permission to do that."],
    [/없습니다|없어요/, "Not found."],
    [/필요|입력/, "Please check your input and try again."],
    [/완료|성공/, "Done."],
    [/취소/, "Cancelled."],
    [/삭제/, "Deleted."],
    [/저장/, "Saved."],
  ];
  for (const [re, enMsg] of rules) {
    if (re.test(ko)) return enMsg;
  }
  return "Please try again.";
}

function stripComments(line) {
  let s = line;
  const block = s.indexOf("/*");
  if (block >= 0) s = s.slice(0, block);
  const slash = s.indexOf("//");
  if (slash >= 0) s = s.slice(0, slash);
  return s;
}

/** Replace quoted strings that contain Hangul (not already t("...")). */
function replaceQuotedStrings(code, onReplace) {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      let escaped = false;
      while (j < code.length) {
        const c = code[j];
        if (escaped) {
          escaped = false;
          j++;
          continue;
        }
        if (c === "\\") {
          escaped = true;
          j++;
          continue;
        }
        if (c === quote) break;
        j++;
      }
      const inner = code.slice(i + 1, j);
      const full = code.slice(i, j + 1);
      if (quote !== "`" && hangul.test(inner) && !/^\s*t\s*\(/.test(code.slice(Math.max(0, i - 8), i))) {
        if (inner.includes("${")) {
          out += full;
        } else {
          const key = ensureEntry(inner);
          const rep = `t("${key}")`;
          onReplace(inner, key);
          out += rep;
        }
      } else if (quote === "`" && hangul.test(inner)) {
        const tpl = inner.replace(/\$\{([^}]+)\}/g, (_, expr) => `{${expr.trim()}}`);
        if (/\{[^}]+\}/.test(tpl)) {
          const parts = inner.split(/\$\{([^}]+)\}/);
          const staticKo = parts.filter((_, idx) => idx % 2 === 0).join("");
          if (hangul.test(staticKo)) {
            const key = ensureEntry(staticKo.replace(/\s+/g, " ").trim() || inner);
            if (!en[key] || hangul.test(String(en[key])) || TODO_PREFIX.test(String(en[key]))) {
              en[key] = englishForKo(staticKo.trim()) ?? provisionalEnglish(staticKo);
            }
            const vars = [];
            let repl = "`";
            for (let k = 0; k < parts.length; k++) {
              if (k % 2 === 1) {
                const varName = `v${vars.length}`;
                vars.push([varName, parts[k].trim()]);
                repl += `\${${parts[k]}}`;
              } else if (parts[k] && hangul.test(parts[k])) {
                repl += `\${t("${key}"${vars.length ? "" : ""})}`;
              } else {
                repl += parts[k];
              }
            }
            repl += "`";
            out += `t("${key}", { ${vars.map(([n, e]) => `${n}: ${e}`).join(", ")} })`;
            onReplace(inner, key);
          } else {
            out += full;
          }
        } else {
          const key = ensureEntry(inner);
          out += `t("${key}")`;
          onReplace(inner, key);
        }
      } else {
        out += full;
      }
      i = j + 1;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** JSX text nodes: > ... hangul ... < */
function replaceJsxText(code, onReplace) {
  return code.replace(/>([^<>{}]*[가-힣][^<>{}]*)</g, (match, text) => {
    const trimmed = text.trim();
    if (!trimmed || !hangul.test(trimmed)) return match;
    if (trimmed.includes("{")) return match;
    const key = ensureEntry(trimmed);
    onReplace(trimmed, key);
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return `>${lead}{t("${key}")}${trail}<`;
  });
}

function ensureClientHooks(src) {
  if (!src.includes('"use client"') && !src.includes("'use client'")) return src;
  if (/\bt\s*\(\s*"/.test(src) && !src.includes("createTranslator") && !/[\{,]\s*t\s*\}\s*=\s*useLocale/.test(src)) {
    src = src.replace(
      /^(["']use client["'];?\s*\n)/,
      `$1import { createTranslator } from "@/lib/i18n/messages";\nconst t = createTranslator("en");\n\n`
    );
  }
  return src;
}

function ensureModuleTranslator(src) {
  if (src.includes('"use client"') || src.includes("'use client'")) return src;
  if (src.includes("createTranslator")) return src;
  if (!/\bt\s*\(\s*"/.test(src)) return src;
  const importBlock =
    'import { createTranslator } from "@/lib/i18n/messages";\nconst t = createTranslator("en");\n\n';
  if (/^["']use server["']/m.test(src)) {
    return src.replace(/^(["']use server["'];?\s*\n)/, `$1${importBlock}`);
  }
  return `${importBlock}${src}`;
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.(tsx|ts)$/.test(name)) files.push(p);
  }
  return files;
}

const files = walk(targetDir);
let changed = 0;
const addedKeys = new Set();

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/);
  let hasHangulCode = false;
  for (const line of lines) {
    if (hangul.test(stripComments(line))) {
      hasHangulCode = true;
      break;
    }
  }
  if (!hasHangulCode) continue;

  let modified = src;
  const onReplace = (_, key) => addedKeys.add(key);

  modified = replaceJsxText(modified, onReplace);
  modified = replaceQuotedStrings(modified, onReplace);

  if (modified !== src) {
    modified = modified.replace(/([a-zA-Z0-9_-]+=\s*)t\("([^"]+)"\)/g, '$1{t("$2")}');
    modified = modified.replace(/([a-zA-Z0-9_-]+=\s*)t\("([^"]+)",\s*(\{[^}]+\})\)/g, '$1{t("$2", $3)}');
    modified = ensureClientHooks(modified);
    modified = ensureModuleTranslator(modified);
    fs.writeFileSync(file, modified, "utf8");
    changed++;
    console.log("updated", path.relative(root, file));
  }
}

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
console.log(`Done: ${changed} files, ${addedKeys.size} keys touched, en.json ${Object.keys(en).length} keys`);
