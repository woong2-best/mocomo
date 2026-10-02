/**
 * Run batch2-folder on each src/components/* not yet committed (step 5).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const skip = new Set(["used", "settings", "market", "feed", "wallet", "live", "i18n", "ui", "providers"]);
const root = path.join(process.cwd(), "src/components");
const log = execSync('git log --oneline --grep="migrate components" --format=%s', { encoding: "utf8" });
const done = new Set();
for (const line of log.split("\n")) {
  const m = line.match(/components\/(\S+)/);
  if (m) done.add(m[1]);
}

const dirs = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((n) => !skip.has(n) && !done.has(n))
  .sort();

const skippedPath = path.join(process.cwd(), ".build-tmp/batch2-skipped.txt");
fs.mkdirSync(path.dirname(skippedPath), { recursive: true });

for (const name of dirs) {
  const folder = `src/components/${name}`;
  console.log("\n========", name, "========");
  try {
    execSync(`node scripts/i18n/batch2-folder.mjs ${folder} ${name} "migrate components/${name}"`, {
      stdio: "inherit",
    });
  } catch (e) {
    const code = e.status ?? 1;
    if (code === 2) {
      fs.appendFileSync(skippedPath, `${folder}\n`, "utf8");
    } else {
      throw e;
    }
  }
}

console.log("\nDone components. Skipped logged to", skippedPath);
