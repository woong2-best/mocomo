/** Build .build-tmp/ko-en-index.json { ko: { key, en } } from export/fill artifacts + en.json. */
import fs from "node:fs";
import path from "node:path";

const hangul = /[가-힣]/;
const TODO = /^\[TODO(?: translate)?\]\s*/;
const en = JSON.parse(fs.readFileSync("src/lib/i18n/locales/en.json", "utf8"));
const index = new Map();

function add(ko, key, enVal) {
  if (!ko || !key) return;
  const prev = index.get(ko);
  if (!prev || (enVal && !hangul.test(enVal) && !TODO.test(enVal))) {
    index.set(ko, { key, en: enVal ?? en[key] ?? "" });
  }
}

const tmp = path.join(process.cwd(), ".build-tmp");
if (fs.existsSync(tmp)) {
  for (const name of fs.readdirSync(tmp)) {
    if (!name.endsWith(".json")) continue;
    const p = path.join(tmp, name);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      continue;
    }
    if (Array.isArray(data) && data[0]?.key && data[0]?.ko) {
      for (const { key, ko } of data) add(ko, key, en[key]);
    } else if (typeof data === "object" && !Array.isArray(data)) {
      for (const [key, val] of Object.entries(data)) {
        if (typeof val !== "string") continue;
        if (!hangul.test(val) && !TODO.test(val)) {
          /* fill file key -> en; ko unknown here */
        }
      }
    }
  }
}

for (const [key, val] of Object.entries(en)) {
  if (typeof val !== "string") continue;
  if (TODO.test(val)) {
    const ko = val.replace(TODO, "").trim();
    if (ko) add(ko, key, en[key]);
  }
}

const out = Object.fromEntries(index);
fs.mkdirSync(tmp, { recursive: true });
fs.writeFileSync(path.join(tmp, "ko-en-index.json"), JSON.stringify(out, null, 2));
console.log(`ko-en-index: ${Object.keys(out).length} entries`);
