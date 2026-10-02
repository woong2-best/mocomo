// Fail CI if Hangul or [TODO translate] in src ts/tsx (non-comment) or en.json values.
// node scripts/ci/check-no-hangul-in-src.mjs
import fs from "node:fs";
import path from "node:path";

const hangul = /[가-힣]/;
const TODO = /\[TODO(?: translate)?\]/;
const exts = new Set([".ts", ".tsx"]);

/** Files excluded from Hangul scan (region/seed/legal data — not UI copy). */
const HANGUL_ALLOWLIST = new Set([
  "src/components/used/used-post-form.tsx",
  "src/lib/korea-regions.ts",
  "src/lib/world-countries.ts",
  "src/lib/legal-content.ts",
  "src/lib/anime-wiki-infobox.ts",
]);

function stripComments(line) {
  let s = line;
  const block = s.indexOf("/*");
  if (block >= 0) s = s.slice(0, block);
  const slash = s.indexOf("//");
  if (slash >= 0) s = s.slice(0, slash);
  return s;
}

/** Hangul inside regex char classes (e.g. slug `[a-z가-힣]`) is not UI copy. */
function lineHasUiHangul(line) {
  const stripped = stripComments(line);
  if (!hangul.test(stripped)) return false;
  const withoutCharClasses = stripped.replace(/\[[^\]]*\]/g, "");
  return hangul.test(withoutCharClasses);
}

function walkSrc(dir, hits) {
  const root = path.join(process.cwd(), "src");
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "__tests__") continue;
      walkSrc(p, hits);
      continue;
    }
    const ext = path.extname(name);
    if (!exts.has(ext)) continue;
    const rel = path.relative(process.cwd(), p).replace(/\\/g, "/");
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (HANGUL_ALLOWLIST.has(rel)) continue;
      if (lineHasUiHangul(line)) {
        hits.push(`${rel}:${i + 1}`);
      }
    }
  }
}

function checkEnJson(hits) {
  const enPath = path.join(process.cwd(), "src/lib/i18n/locales/en.json");
  let en;
  try {
    en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  } catch (e) {
    hits.push(`src/lib/i18n/locales/en.json:parse:${e.message}`);
    return;
  }
  for (const [key, value] of Object.entries(en)) {
    if (typeof value !== "string") continue;
    if (TODO.test(value)) {
      hits.push(`src/lib/i18n/locales/en.json:${key}:[TODO translate]`);
    } else if (hangul.test(value)) {
      hits.push(`src/lib/i18n/locales/en.json:${key}:hangul`);
    }
  }
}

const hits = [];
walkSrc(path.join(process.cwd(), "src"), hits);
checkEnJson(hits);

if (hits.length > 0) {
  console.error(`i18n:check failures (${hits.length}). First 40:`);
  for (const h of hits.slice(0, 40)) console.error(h);
  process.exit(1);
}
console.log("OK: no Hangul in src ts/tsx (non-comment, allowlisted regions exempt), en.json clean");
