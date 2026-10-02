import { execSync } from "node:child_process";
import fs from "node:fs";

const base = process.argv[2] || "76ca0aca";
const n = Number(process.argv[3] || 20);
const oldRaw = execSync(`git show ${base}:src/lib/i18n/locales/en.json`, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
const old = JSON.parse(oldRaw);
const en = JSON.parse(fs.readFileSync("src/lib/i18n/locales/en.json", "utf8"));
const added = Object.keys(en).filter((k) => !(k in old));
const pick = added.sort(() => Math.random() - 0.5).slice(0, n);
for (const k of pick) {
  console.log(`${k}\t${en[k]}`);
}
console.error(`added_keys=${added.length}`);
