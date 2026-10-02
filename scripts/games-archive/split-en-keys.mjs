/**
 * Move en.json keys used only by archived game code into archive/games/en-games.json.
 *   node scripts/games-archive/split-en-keys.mjs          # dry run
 *   node scripts/games-archive/split-en-keys.mjs --write
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EN_PATH = "src/lib/i18n/locales/en.json";
const OUT_PATH = "archive/games/src/lib/i18n/locales/en-games.json";
const write = process.argv.includes("--write");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "locales") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs|cjs|js)$/.test(name)) out.push(p);
  }
  return out;
}

function readAll(dirs) {
  return dirs
    .filter((d) => fs.existsSync(d))
    .flatMap((d) => walk(d))
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n");
}

const en = JSON.parse(fs.readFileSync(EN_PATH, "utf8"));
const liveText = readAll(["src", "server", "studio"]);
const archivedText = readAll(["archive/games"]);
/** Keys referenced before the removal commit — dropped call sites count as archived usage. */
const baseRef = process.env.GAMES_BASE_REF ?? "HEAD";
const baseText = execSync(
  `git grep -h -I -e . ${baseRef} -- src server studio ":!src/lib/i18n/locales"`,
  { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 }
);

const dynamicPrefixes = new Set();
for (const m of liveText.matchAll(/[`"']([a-zA-Z][\w-]*(?:\.[\w-]+)*\.)\$\{/g)) dynamicPrefixes.add(m[1]);
for (const m of liveText.matchAll(/[`"']([a-zA-Z][\w-]*(?:\.[\w-]+)*\.)["'`]\s*\+/g)) dynamicPrefixes.add(m[1]);

function referenced(text, key) {
  return text.includes(`"${key}"`) || text.includes(`'${key}'`) || text.includes(`\`${key}\``);
}

const moved = {};
for (const key of Object.keys(en)) {
  if (referenced(liveText, key)) continue;
  if ([...dynamicPrefixes].some((p) => key.startsWith(p))) continue;
  if (!referenced(archivedText, key) && !referenced(baseText, key)) continue;
  moved[key] = en[key];
}

console.log(`${Object.keys(moved).length} game-only keys (of ${Object.keys(en).length})`);
console.log(`protected dynamic prefixes: ${[...dynamicPrefixes].sort().join(", ")}`);

if (write) {
  const kept = Object.fromEntries(Object.entries(en).filter(([k]) => !(k in moved)));
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(moved, null, 2) + "\n");
  fs.writeFileSync(EN_PATH, JSON.stringify(kept, null, 2) + "\n");
  console.log(`wrote ${OUT_PATH} and ${EN_PATH}`);
}
