/**
 * Bulk-replace Hangul string literals / JSX text in a folder with t("prefix.key").
 * English copy: main-branch ko.json key lookup → current en.json, else new auto key + TODO English.
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
  const hit = koLookup.get(koText);
  if (hit) {
    if (!(hit.key in en)) en[hit.key] = hit.en;
    return hit.key;
  }
  for (const [k, v] of Object.entries(en)) {
    if (v === koText && !hangul.test(v)) return k;
  }
  let enText = koText;
  if (hangul.test(koText)) {
    enText = `[TODO translate] ${koText.slice(0, 80)}`;
  }
  let base = `${keyPrefix}.${slug(koText) || "text"}`;
  let key = base;
  let n = 2;
  while (key in en && en[key] !== enText && en[key] !== koText) {
    key = `${base}_${n++}`;
  }
  if (!(key in en) || hangul.test(en[key])) en[key] = enText;
  return key;
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
            en[key] = en[key]?.includes("[TODO") ? en[key] : `[TODO] ${staticKo}`;
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
  src = `import { createTranslator } from "@/lib/i18n/messages";\nconst t = createTranslator("en");\n\n${src}`;
  return src;
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
