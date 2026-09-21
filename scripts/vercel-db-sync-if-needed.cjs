/**
 * Runs vercel-db-sync.cjs when prisma schema/migrations changed in this commit.
 * Wired into vercel-build so migrate deploy stays automatic without slowing every deploy.
 */
const { spawn, execSync } = require("child_process");
const path = require("path");

const PRISMA_PATHS = ["prisma/schema.prisma", "prisma/migrations"];

function shouldRunDbSync() {
  if (process.env.RUN_DB_DEPLOY === "1") {
    console.log("[db-sync-if-needed] RUN_DB_DEPLOY=1 — running.");
    return true;
  }

  const msg = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";
  if (/\[db deploy\]/i.test(msg)) {
    console.log("[db-sync-if-needed] [db deploy] in commit message — running.");
    return true;
  }

  try {
    execSync("git rev-parse HEAD^", { stdio: "ignore" });
  } catch {
    console.log("[db-sync-if-needed] No parent commit — running to be safe.");
    return true;
  }

  try {
    execSync(`git diff HEAD^ HEAD --quiet -- ${PRISMA_PATHS.join(" ")}`, {
      stdio: "ignore",
    });
    console.log("[db-sync-if-needed] No prisma changes — skipping.");
    return false;
  } catch {
    console.log("[db-sync-if-needed] Prisma changes detected — running.");
    return true;
  }
}

function runSync() {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "vercel-db-sync.cjs");
    const child = spawn("node", [script], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`db sync exited with ${code}`))
    );
    child.on("error", reject);
  });
}

async function main() {
  if (!shouldRunDbSync()) return;
  await runSync();
}

main().catch((err) => {
  console.error("[db-sync-if-needed]", err.message);
  process.exit(1);
});
