/**
 * Merge English fill files (key → text) into en.json, replacing [TODO translate] values.
 * Usage: node scripts/i18n/apply-en-fill.mjs .build-tmp/fill-0.json [...more]
 *        --drop key1,key2   remove orphan keys
 */
import fs from "node:fs";

const enPath = "src/lib/i18n/locales/en.json";
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const args = process.argv.slice(2);
const dropIdx = args.indexOf("--drop");
const drop = dropIdx >= 0 ? args.splice(dropIdx, 2)[1].split(",") : [];
const addIdx = args.indexOf("--add");
const allowAdd = addIdx >= 0;
if (allowAdd) args.splice(addIdx, 1);

let applied = 0;
let unknown = 0;
for (const file of args) {
  const fill = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, value] of Object.entries(fill)) {
    if (!(key in en) && !allowAdd) {
      unknown++;
      console.warn(`unknown key: ${key}`);
      continue;
    }
    en[key] = value;
    applied++;
  }
}
for (const key of drop) delete en[key];

fs.writeFileSync(enPath, `${JSON.stringify(en, null, 2)}\n`, "utf8");

const values = Object.values(en).map(String);
const todo = values.filter((v) => v.includes("[TODO translate]")).length;
const hangul = values.filter((v) => /[\uAC00-\uD7A3]/.test(v)).length;
console.log(`applied=${applied} unknown=${unknown} dropped=${drop.length}`);
console.log(`en.json: [TODO translate]=${todo} hangulValues=${hangul}`);
for (const [k, v] of Object.entries(en)) {
  if (v.includes("[TODO translate]") || /[\uAC00-\uD7A3]/.test(v)) console.log(`  left: ${k}`);
}
