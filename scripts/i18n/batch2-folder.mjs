/**
 * Migrate one folder, run tsc, commit on success.
 * Usage: node scripts/i18n/batch2-folder.mjs <path> <keyPrefix> <commitLabel>
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [folder, prefix, label] = process.argv.slice(2);
if (!folder || !prefix || !label) {
  console.error("Usage: batch2-folder.mjs <folder> <keyPrefix> <commitLabel>");
  process.exit(1);
}

execSync("node scripts/i18n/build-ko-en-index.mjs", { stdio: "inherit" });
try {
  execSync(`node scripts/i18n/migrate-folder-hangul.mjs ${folder} ${prefix}`, { stdio: "inherit" });
} catch {
  console.error("migrate failed", folder);
  execSync(`git checkout -- ${folder}`, { stdio: "inherit" });
  process.exit(2);
}

let tscOk = false;
try {
  execSync("npx tsc --noEmit", { stdio: "pipe", encoding: "utf8" });
  tscOk = true;
} catch (e) {
  const out = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
  const rel = folder.replace(/\\/g, "/");
  const relevant = out.split("\n").filter((l) => l.includes(rel.replace(/^src\//, "src/")));
  fs.writeFileSync(".build-tmp/last-tsc.err", out, "utf8");
  if (relevant.length > 0) {
    console.error("tsc failed for folder", folder);
    console.error(relevant.slice(0, 15).join("\n"));
    execSync(`git checkout -- ${folder}`, { stdio: "inherit" });
    execSync("git checkout -- src/lib/i18n/locales/en.json", { stdio: "inherit" });
    console.log("SKIPPED", folder);
    process.exit(2);
  }
  console.warn("tsc failed but not in this folder; committing anyway");
  tscOk = true;
}

if (tscOk) {
  execSync(`git add ${folder} src/lib/i18n/locales/en.json`, { stdio: "inherit" });
  execSync(`git commit -m "fix(i18n): ${label} (step 5)"`, { stdio: "inherit" });
  console.log("COMMITTED", folder);
}
