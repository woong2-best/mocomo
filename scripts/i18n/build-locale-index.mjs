import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../locales");
const files = fs
  .readdirSync(localesDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

const imports = files
  .map((f) => {
    const code = f.replace(/\.json$/, "");
    const varName = code.replace(/[^a-zA-Z0-9]/g, "_");
    return `import ${varName} from "./locales/${f}";`;
  })
  .join("\n");

const entries = files
  .map((f) => {
    const code = f.replace(/\.json$/, "");
    const varName = code.replace(/[^a-zA-Z0-9]/g, "_");
    return `  "${code}": ${varName} as Record<MessageKey, string>,`;
  })
  .join("\n");

const out = `/** Auto-generated — run: node scripts/i18n/build-locale-index.mjs */
import type { Locale } from "./config";
import type { MessageKey } from "./message-keys";
${imports}

export const LOCALE_TABLES: Record<Locale, Record<MessageKey, string>> = {
${entries}
};
`;

fs.writeFileSync(path.join(__dirname, "../locale-tables.ts"), out, "utf8");
console.log(`Generated locale-tables.ts (${files.length} locales)`);
