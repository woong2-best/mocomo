/**
 * Run migrate-folder-hangul on each src/components/* subdir (skip already migrated).
 * Usage: node scripts/i18n/batch2-migrate-components.mjs [folderName ...]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const skip = new Set(["used", "settings", "market", "feed", "wallet", "live", "i18n", "ui", "providers"]);
const root = path.join(process.cwd(), "src/components");
const only = process.argv.slice(2);
const dirs = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((n) => !skip.has(n))
  .filter((n) => (only.length ? only.includes(n) : true))
  .sort();

for (const name of dirs) {
  const rel = `src/components/${name}`;
  console.log("\n===", rel, "===");
  execSync(`node scripts/i18n/migrate-folder-hangul.mjs ${rel} ${name}`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}
