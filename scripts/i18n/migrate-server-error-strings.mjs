/**
 * Replace quoted Hangul strings in src/actions and src/lib (non-allowlisted)
 * with catalog keys for server-side returns. Skips comments and regex char classes.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const hangul = /[가-힣]/;
const enPath = path.join(process.cwd(), "src/lib/i18n/locales/en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

const FILE_ALLOWLIST = new Set([
  "src/lib/korea-regions.ts",
  "src/lib/world-countries.ts",
  "src/lib/legal-content.ts",
  "src/lib/anime-wiki-infobox.ts",
  "src/components/used/used-post-form.tsx",
]);

function stripComments(line) {
  let s = line;
  const block = s.indexOf("/*");
  if (block >= 0) s = s.slice(0, block);
  const slash = s.indexOf("//");
  if (slash >= 0) s = s.slice(0, slash);
  return s;
}

function lineHasUiHangul(line) {
  const stripped = stripComments(line);
  if (!hangul.test(stripped)) return false;
  const withoutCharClasses = stripped.replace(/\[[^\]]*\]/g, "");
  return hangul.test(withoutCharClasses);
}

function slug(text) {
  return `s${crypto.createHash("sha1").update(text).digest("hex").slice(0, 10)}`;
}

function ensureKey(ko, prefix) {
  const key = `${prefix}.${slug(ko)}`;
  if (!(key in en)) en[key] = `[TODO translate] ${ko.slice(0, 160)}`;
  return key;
}

function replaceQuotedInCode(code, prefix) {
  let out = "";
  let i = 0;
  let repl = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '"' || ch === "'") {
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
      if (hangul.test(inner) && !/^\s*t\s*\(/.test(code.slice(Math.max(0, i - 8), i))) {
        const key = ensureKey(inner, prefix);
        out += `"${key}"`;
        repl++;
        i = j + 1;
        continue;
      }
      out += code.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    out += ch;
    i++;
  }
  return { out, repl };
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.(ts|tsx)$/.test(name)) files.push(p);
  }
  return files;
}

const roots = [
  path.join(process.cwd(), "src/actions"),
  path.join(process.cwd(), "src/lib"),
  path.join(process.cwd(), "src/hooks"),
];

let filesChanged = 0;
let totalRepl = 0;

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
    if (FILE_ALLOWLIST.has(rel)) continue;
    if (rel.includes("/i18n/") || rel.includes("/__tests__/")) continue;
    const src = fs.readFileSync(file, "utf8");
    const lines = src.split(/\r?\n/);
    if (!lines.some((l) => lineHasUiHangul(l))) continue;

    const prefix = rel
      .replace(/^src\//, "")
      .replace(/\.(tsx|ts)$/, "")
      .replace(/[^a-zA-Z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");

    const { out, repl } = replaceQuotedInCode(src, prefix);
    if (repl > 0 && out !== src) {
      fs.writeFileSync(file, out, "utf8");
      filesChanged++;
      totalRepl += repl;
      console.log(`${rel}: ${repl}`);
    }
  }
}

fs.writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`, "utf8");
console.log(`done files=${filesChanged} repl=${totalRepl} en=${Object.keys(en).length}`);
