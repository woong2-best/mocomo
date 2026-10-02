/**
 * Merge a flat { key: englishValue } JSON file into src/lib/i18n/locales/en.json.
 * Refuses values that contain Hangul or "[TODO".
 *
 * Usage: node scripts/i18n/add-keys.mjs <keys.json> [--overwrite]
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enPath = path.join(root, "src/lib/i18n/locales/en.json");
const input = process.argv[2];
const overwrite = process.argv.includes("--overwrite");
if (!input) {
  console.error("Usage: add-keys.mjs <keys.json> [--overwrite]");
  process.exit(1);
}
const en = JSON.parse(fs.readFileSync(enPath, "utf8").replace(/^\uFEFF/, ""));
const add = JSON.parse(fs.readFileSync(path.resolve(input), "utf8").replace(/^\uFEFF/, ""));
let added = 0;
let skipped = 0;
for (const [k, v] of Object.entries(add)) {
  if (typeof v !== "string" || /[가-힣]/.test(v) || v.includes("[TODO")) {
    console.error("REJECTED (Hangul/TODO):", k, v);
    process.exitCode = 1;
    continue;
  }
  if (k in en && !overwrite) {
    skipped++;
    continue;
  }
  en[k] = v;
  added++;
}
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
console.log(`added ${added}, skipped ${skipped}, total ${Object.keys(en).length}`);
