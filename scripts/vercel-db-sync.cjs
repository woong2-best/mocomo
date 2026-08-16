/**
 * Vercel build DB sync — bounded runtime so deploys cannot hang for 45+ minutes.
 * Applies pending Prisma migrations, then optional seed (both time-capped).
 */
const { spawn } = require("child_process");

const MIGRATE_TIMEOUT_MS = 4 * 60 * 1000;
const SEED_TIMEOUT_MS = 2 * 60 * 1000;

function runCommand(label, command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    console.log(`[vercel-db-sync] ${label}…`);
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  try {
    await runCommand(
      "prisma migrate deploy",
      "npx",
      ["prisma", "migrate", "deploy"],
      MIGRATE_TIMEOUT_MS
    );
  } catch (err) {
    console.warn("[vercel-db-sync] migrate deploy skipped:", err.message);
    return;
  }

  try {
    await runCommand("prisma seed", "npx", ["tsx", "prisma/seed.ts"], SEED_TIMEOUT_MS);
  } catch (err) {
    console.warn("[vercel-db-sync] seed skipped:", err.message);
  }
}

main().catch((err) => {
  console.warn("[vercel-db-sync] unexpected:", err.message);
});
