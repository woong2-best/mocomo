/**
 * batch2 on src/lib subdirs + lib root ts files (exclude allowlisted).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const libRoot = path.join(process.cwd(), "src/lib");
const skipFiles = new Set([
  "legal-content.ts",
  "korea-regions.ts",
  "world-countries.ts",
  "anime-wiki-infobox.ts",
]);
const skipDirs = new Set(["i18n", "__tests__", "seed"]);

const log = execSync('git log --oneline --grep="migrate lib" --format=%s', { encoding: "utf8" });
const done = new Set();
for (const line of log.split("\n")) {
  const m = line.match(/lib\/(\S+)/);
  if (m) done.add(m[1].replace(/\/.*$/, ""));
}

const skippedPath = path.join(process.cwd(), ".build-tmp/batch2-skipped.txt");

function runBatch(folder, prefix, label, exclude = "") {
  console.log("\n========", folder, "========");
  const ex = exclude ? ` ${exclude}` : "";
  try {
    execSync(`node scripts/i18n/batch2-folder.mjs ${folder} ${prefix} "${label}"${ex}`, { stdio: "inherit" });
  } catch (e) {
    if ((e.status ?? 1) === 2) {
      fs.appendFileSync(skippedPath, `${folder}\n`, "utf8");
    } else {
      throw e;
    }
  }
}

const subdirs = fs
  .readdirSync(libRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((n) => !skipDirs.has(n))
  .sort();

for (const name of subdirs) {
  if (done.has(name)) continue;
  runBatch(`src/lib/${name}`, `lib.${name}`, `migrate lib/${name}`);
}

if (!done.has("_root")) {
  const exclude = [...skipFiles].join(",");
  runBatch(
    `src/lib`,
    "lib",
    "migrate lib root ts",
    [...skipFiles, "used-auction.ts"].join(",")
  );
}
