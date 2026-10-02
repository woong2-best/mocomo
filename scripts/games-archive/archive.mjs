import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { WEB_MOVE_SET } from "./move-set.mjs";

const ROOT = "archive/games";

for (const p of WEB_MOVE_SET) {
  if (!existsSync(p)) {
    console.log(`skip (missing): ${p}`);
    continue;
  }
  const dest = path.posix.join(ROOT, p);
  mkdirSync(path.posix.dirname(dest), { recursive: true });
  execFileSync("git", ["mv", p, dest], { stdio: "inherit" });
  console.log(`moved: ${p}`);
}
