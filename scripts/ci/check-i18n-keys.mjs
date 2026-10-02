/**
 * Fail when src references a catalog key that en.json doesn't define.
 * A "key" is a string literal like "actions.s1mzxopt" whose first segment is an en.json namespace —
 * covers t("…") calls, `error: "…"` codes returned by actions, and comparisons against codes.
 * Usage: node scripts/ci/check-i18n-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";

const en = JSON.parse(fs.readFileSync("src/lib/i18n/locales/en.json", "utf8"));
const keys = new Set(Object.keys(en));
const namespaces = new Set([...keys].map((k) => k.split(".")[0]));

/** Dotted identifiers that share a namespace with en.json but aren't catalog keys. */
const NOT_KEYS = [/^chat\.(ban|unban|delete|pin|reports|settings|timeout)$/];

const LITERAL = /(["'`])([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9_-]+)+)\1/g;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated"]);
const IGNORE_LINE = /^\s*(import|export \* from|\/\/|\*)|from\s+["']|require\(|\.(png|jpe?g|svg|webp|gif|mp4|json|css|ts|tsx|js|mjs)["']/;

function walk(d, files = []) {
  for (const name of fs.readdirSync(d)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = path.join(d, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.tsx?$/.test(name)) files.push(p);
  }
  return files;
}

const missing = new Map();
for (const file of walk("src")) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (IGNORE_LINE.test(line)) return;
    for (const m of line.matchAll(LITERAL)) {
      const key = m[2];
      const ns = key.split(".")[0];
      if (!namespaces.has(ns) || keys.has(key)) continue;
      if (NOT_KEYS.some((re) => re.test(key))) continue;
      if (/\.(com|net|org|io|dev|app|co|kr|jp)$/.test(key)) continue;
      const at = `${path.relative(process.cwd(), file).replaceAll("\\", "/")}:${i + 1}`;
      if (!missing.has(key)) missing.set(key, []);
      missing.get(key).push(at);
    }
  });
}

if (missing.size === 0) {
  console.log(`i18n keys OK — every referenced key exists in en.json (${keys.size} keys).`);
  process.exit(0);
}
console.error(`${missing.size} key(s) referenced in src but missing from en.json:`);
for (const [key, sites] of [...missing].sort()) {
  console.error(`  ${key}  (${sites.slice(0, 3).join(", ")}${sites.length > 3 ? `, +${sites.length - 3}` : ""})`);
}
process.exit(1);
