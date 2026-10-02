/** Keys that were [TODO translate] at a base commit but aren't in the given fill files: print key, Korean, current English. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [baseRef, ...fillFiles] = process.argv.slice(2);
const enPath = "src/lib/i18n/locales/en.json";
const base = JSON.parse(execFileSync("git", ["show", `${baseRef}:${enPath}`], { encoding: "utf8", maxBuffer: 64 << 20 }));
const now = JSON.parse(fs.readFileSync(enPath, "utf8"));
const filled = new Set(fillFiles.flatMap((f) => Object.keys(JSON.parse(fs.readFileSync(f, "utf8")))));

for (const [k, v] of Object.entries(base)) {
  if (!String(v).startsWith("[TODO translate]") || filled.has(k) || !(k in now)) continue;
  const ko = String(v).replace(/^\[TODO translate\]\s*/, "").replace(/\s*\n\s*/g, " ");
  console.log(`${k}\t${ko}\t${now[k].replace(/\s*\r?\n\s*/g, " ")}`);
}
