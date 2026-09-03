/**
 * Generate static locale JSON from en.json (per-key parallel translate).
 * node scripts/i18n/generate-locales.mjs [locale]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WORLD_LOCALES, googleLang } from "./world-locales.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const localesDir = path.join(root, "src/lib/i18n/locales");

const SKIP = new Set(["ko", "en", "ja", "zh"]);
const CONCURRENCY = 6;

const en = JSON.parse(fs.readFileSync(path.join(localesDir, "en.json"), "utf8"));
const keys = Object.keys(en);

async function mapPool(items, fn, limit) {
  const ret = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return ret;
}

async function buildLocale(code) {
  const outPath = path.join(localesDir, `${code}.json`);
  if (SKIP.has(code)) {
    console.log(`Skip ${code}`);
    return;
  }

  const { translate } = await import("@vitalets/google-translate-api");
  const target = googleLang(code);
  console.log(`\n${code} → ${target} (${keys.length} keys)`);

  const values = await mapPool(
    keys,
    async (key) => {
      try {
        const res = await translate(en[key], { from: "en", to: target });
        return res.text;
      } catch {
        return en[key];
      }
    },
    CONCURRENCY
  );

  const result = {};
  keys.forEach((k, i) => {
    result[k] = values[i] || en[k];
  });

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(`Wrote ${code}.json`);
}

async function main() {
  const only = process.argv[2];
  const targets = only ? [only] : WORLD_LOCALES.filter((c) => !SKIP.has(c));
  for (const code of targets) {
    await buildLocale(code);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
