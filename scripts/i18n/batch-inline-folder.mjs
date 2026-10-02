/**
 * Inline Hangul → English for one folder; tsc; commit (no en.json).
 * Usage: node scripts/i18n/batch-inline-folder.mjs <folder> <commitLabel>
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const [folder, label] = process.argv.slice(2);
if (!folder || !label) {
  console.error("Usage: batch-inline-folder.mjs <folder> <commitLabel>");
  process.exit(1);
}

try {
  execSync("node scripts/i18n/build-ko-en-index.mjs", { stdio: "inherit" });
} catch {
  console.warn("ko-en-index build skipped");
}

try {
  const extra = folder === "src/lib" ? " no-recurse" : "";
  execSync(`node scripts/i18n/replace-folder-hangul-inline.mjs ${folder}${extra}`, { stdio: "inherit" });
} catch {
  console.error("inline replace failed", folder);
  execSync(`git checkout -- ${folder}`, { stdio: "inherit" });
  process.exit(2);
}

const changed = execSync(`git diff --name-only -- ${folder}`, { encoding: "utf8" }).trim();
if (!changed) {
  console.log("NO_CHANGES", folder);
  process.exit(0);
}

console.log("\n--- git diff --stat ---");
execSync(`git diff --stat -- ${folder}`, { stdio: "inherit" });

try {
  execSync("npx tsc --noEmit", { stdio: "pipe", encoding: "utf8" });
} catch (e) {
  const out = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
  const rel = folder.replace(/\\/g, "/");
  const relevant = out.split("\n").filter((l) => l.includes(rel));
  fs.writeFileSync(".build-tmp/last-tsc.err", out, "utf8");
  if (relevant.length > 0) {
    console.error("tsc failed for folder", folder);
    console.error(relevant.slice(0, 12).join("\n"));
    execSync(`git checkout -- ${folder}`, { stdio: "inherit" });
    fs.appendFileSync(".build-tmp/inline-batch-skipped.txt", `${folder}\n`, "utf8");
    console.log("SKIPPED", folder);
    process.exit(2);
  }
  console.error("tsc failed (not in this folder); skipping commit for", folder);
  execSync(`git checkout -- ${folder}`, { stdio: "inherit" });
  fs.appendFileSync(".build-tmp/inline-batch-skipped.txt", `${folder}\n`, "utf8");
  process.exit(2);
}

execSync(`git add ${folder}`, { stdio: "inherit" });
try {
  execSync(`git commit -m "fix(i18n): ${label}" -- ${folder}`, { stdio: "inherit" });
} catch (e) {
  const staged = execSync("git diff --cached --name-only", { encoding: "utf8" }).trim();
  if (!staged) throw e;
  execSync(`git commit -m "fix(i18n): ${label}"`, { stdio: "inherit" });
}
console.log("COMMITTED", folder);
