/**
 * Inline English pass for remaining src trees (one folder at a time, tsc + commit).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const skippedPath = path.join(process.cwd(), ".build-tmp/inline-batch-skipped.txt");
fs.mkdirSync(path.dirname(skippedPath), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), ".build-tmp/inline-hangul-skipped.txt"), "", "utf8");

function run(folder, label) {
  console.log("\n========", folder, "========");
  try {
    const extra = folder === "src/lib" ? " no-recurse" : "";
    if (extra.trim()) {
      execSync(`node scripts/i18n/batch-inline-folder.mjs ${folder} "${label}"`, { stdio: "inherit" });
    } else {
      execSync(`node scripts/i18n/batch-inline-folder.mjs ${folder} "${label}"`, { stdio: "inherit" });
    }
  } catch (e) {
    if ((e.status ?? 1) !== 2) throw e;
  }
}

const skipApp = new Set(["api"]);
const appRoot = path.join(process.cwd(), "src/app");
for (const name of fs.readdirSync(appRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  if (skipApp.has(name)) continue;
  run(`src/app/${name}`, `inline EN app/${name}`);
}

const compRoot = path.join(process.cwd(), "src/components");
for (const name of fs
  .readdirSync(compRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()) {
  run(`src/components/${name}`, `inline EN components/${name}`);
}

run("src/actions", "inline EN actions");
run("src/hooks", "inline EN hooks");

const skipLibDirs = new Set(["i18n", "__tests__", "seed"]);
const libRoot = path.join(process.cwd(), "src/lib");
for (const name of fs
  .readdirSync(libRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((n) => !skipLibDirs.has(n))
  .sort()) {
  run(`src/lib/${name}`, `inline EN lib/${name}`);
}

run("src/lib", "inline EN lib root ts");

console.log("\nFinish inline done. Skipped:", skippedPath);
