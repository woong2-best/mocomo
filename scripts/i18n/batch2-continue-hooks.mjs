import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const folder = "src/hooks";
const skippedPath = path.join(process.cwd(), ".build-tmp/batch2-skipped.txt");
console.log("======== hooks ========");
try {
  execSync(`node scripts/i18n/batch2-folder.mjs ${folder} hooks "migrate hooks"`, { stdio: "inherit" });
} catch (e) {
  if ((e.status ?? 1) === 2) fs.appendFileSync(skippedPath, `${folder}\n`, "utf8");
  else throw e;
}
