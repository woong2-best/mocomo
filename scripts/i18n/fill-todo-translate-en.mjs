/**
 * Replace en.json values like "[TODO translate] …" with English (Google Translate, ko→en).
 * Skips keys whose text has no Hangul (already English placeholders).
 */
import fs from "node:fs";
import path from "node:path";
import { translate } from "@vitalets/google-translate-api";

const enPath = path.join(process.cwd(), "src/lib/i18n/locales/en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

const HANGUL = /[\uAC00-\uD7A3]/;
const TODO_PREFIX = /^\[TODO translate\]\s*/;

const entries = Object.entries(en).filter(([, v]) => TODO_PREFIX.test(String(v)));
console.log(`Translating ${entries.length} TODO entries…`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let done = 0;
let failed = 0;

for (const [key, raw] of entries) {
  const source = String(raw).replace(TODO_PREFIX, "").trim();
  if (!source) continue;
  if (!HANGUL.test(source)) {
    en[key] = source;
    done++;
    continue;
  }
  try {
    const { text } = await translate(source, { from: "ko", to: "en" });
    en[key] = text;
    done++;
    if (done % 25 === 0) {
      console.log(`  ${done}/${entries.length}…`);
      fs.writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`, "utf8");
    }
    await sleep(350);
  } catch (e) {
    failed++;
    console.warn(`FAIL ${key}:`, e.message ?? e);
    await sleep(2000);
  }
}

fs.writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`, "utf8");
console.log(`Done. translated=${done} failed=${failed}`);
