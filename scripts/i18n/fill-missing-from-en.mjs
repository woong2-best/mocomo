/** Copy en.json → missing locale files (temporary until i18n:generate completes). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WORLD_LOCALES } from "./world-locales.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const dir = path.join(root, "src/lib/i18n/locales");
const en = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8"));

for (const code of WORLD_LOCALES) {
  const p = path.join(dir, `${code}.json`);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(en, null, 2) + "\n");
    console.log("filled", code, "from en");
  }
}

console.log("done");
