/**
 * Hangul line counts in src (non-comment lines), grouped by folder.
 * Usage: node scripts/i18n/hangul-stats.mjs [depth=3]
 * Same counting rule as scripts/ci/check-no-hangul-in-src.mjs.
 */
import fs from "node:fs";
import path from "node:path";

const depth = Number(process.argv[2] || 3);
const root = path.join(process.cwd(), "src");
const hangul = /[\uAC00-\uD7A3]/;
const groups = new Map();
let total = 0;

function stripComments(line) {
  let s = line;
  const block = s.indexOf("/*");
  if (block >= 0) s = s.slice(0, block);
  const slash = s.indexOf("//");
  if (slash >= 0) s = s.slice(0, slash);
  return s;
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    const rel = path.relative(process.cwd(), p).replace(/\\/g, "/");
    let n = 0;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      if (hangul.test(stripComments(line))) n++;
    }
    if (!n) continue;
    total += n;
    const key = rel.split("/").slice(0, depth).join("/");
    groups.set(key, (groups.get(key) ?? 0) + n);
  }
}
walk(root);
const rows = [...groups.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, n] of rows) console.log(String(n).padStart(6), k);
console.log(String(total).padStart(6), "TOTAL");
