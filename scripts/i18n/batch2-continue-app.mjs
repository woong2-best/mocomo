/**
 * batch2 per src/app/* route folder; skip auth and settings.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const skip = new Set(["auth", "settings"]);
const root = path.join(process.cwd(), "src/app");
const log = execSync('git log --oneline --grep="migrate app/" --format=%s', { encoding: "utf8" });
const done = new Set();
for (const line of log.split("\n")) {
  const m = line.match(/app\/(\S+)/);
  if (m) done.add(m[1]);
}

const dirs = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((n) => !skip.has(n) && !done.has(n))
  .sort();

const skippedPath = path.join(process.cwd(), ".build-tmp/batch2-skipped.txt");

for (const name of dirs) {
  const folder = `src/app/${name}`;
  console.log("\n======== app/", name, "========");
  try {
    execSync(`node scripts/i18n/batch2-folder.mjs ${folder} app.${name} "migrate app/${name}"`, {
      stdio: "inherit",
    });
  } catch (e) {
    if ((e.status ?? 1) === 2) {
      fs.appendFileSync(skippedPath, `${folder}\n`, "utf8");
    } else {
      throw e;
    }
  }
}
