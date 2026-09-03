/**
 * Extract ko/en/ja/zh tables from messages.ts → src/lib/i18n/locales/*.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const messagesPath = path.join(root, "src/lib/i18n/messages.ts");
const outDir = path.join(root, "src/lib/i18n/locales");

const content = fs.readFileSync(messagesPath, "utf8");

function extractLocale(name) {
  const start = content.indexOf(`const ${name}: Record<MessageKey, string> = {`);
  if (start < 0) throw new Error(`Missing locale block: ${name}`);
  let i = content.indexOf("{", start) + 1;
  let depth = 1;
  while (i < content.length && depth > 0) {
    const ch = content[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  const body = content.slice(content.indexOf("{", start) + 1, i - 1);
  const entries = {};
  const lineRe = /^\s+"([^"]+)":\s+"((?:\\.|[^"\\])*)"\s*,?\s*$/gm;
  let m;
  while ((m = lineRe.exec(body))) {
    entries[m[1]] = m[2]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\\\/g, "\\");
  }
  return entries;
}

fs.mkdirSync(outDir, { recursive: true });
for (const loc of ["ko", "en", "ja", "zh"]) {
  const data = extractLocale(loc);
  const outPath = path.join(outDir, `${loc}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Wrote ${loc}.json (${Object.keys(data).length} keys)`);
}
