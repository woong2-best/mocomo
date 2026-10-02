/** Dump [TODO translate] entries for batch English fill. */
import fs from "node:fs";

const en = JSON.parse(fs.readFileSync("src/lib/i18n/locales/en.json", "utf8"));
const TODO = /^\[TODO translate\]\s*/;
const out = [];
for (const [key, raw] of Object.entries(en)) {
  if (!TODO.test(String(raw))) continue;
  out.push({ key, ko: String(raw).replace(TODO, "").trim() });
}
fs.writeFileSync(".build-tmp/todo-en-export.json", JSON.stringify(out, null, 2));
console.log(out.length);
