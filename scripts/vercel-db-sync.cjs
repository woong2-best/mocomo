/**
 * Production DB sync — migrate deploy + seed.
 *
 * Vercel: vercel-db-sync-if-needed.cjs runs this when prisma/schema or migrations changed.
 * Manual: npm run db:deploy
 *
 * Clears known failed migration state, applies pending migrations, then optional seed.
 * Bounded runtime so migrate/seed cannot hang indefinitely.
 */
const { spawn } = require("child_process");

const MIGRATE_TIMEOUT_MS = 4 * 60 * 1000;
const SEED_TIMEOUT_MS = 2 * 60 * 1000;
const RESOLVE_TIMEOUT_MS = 60 * 1000;

const FAILED_WATERMARK_MIGRATION = "20260816150000_watermark_forensics";
const FAILED_COMMUNITY_CATEGORY_MIGRATION = "20260904120000_community_category_v3";
const FAILED_MOCO_MEDIA_DONATION_MIGRATION = "20260921120000_moco_media_donation";

function runCommand(label, command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    console.log(`[vercel-db-sync] ${label}…`);
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
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

async function tryResolveFailedMigration(name, label) {
  try {
    await runCommand(
      label,
      "npx",
      ["prisma", "migrate", "resolve", "--rolled-back", name],
      RESOLVE_TIMEOUT_MS
    );
    console.log(`[vercel-db-sync] cleared failed migration state: ${name}`);
  } catch {
    // Not in failed state — expected on healthy databases.
  }
}

async function main() {
  await tryResolveFailedMigration(
    FAILED_WATERMARK_MIGRATION,
    "clear failed watermark migration"
  );
  await tryResolveFailedMigration(
    FAILED_COMMUNITY_CATEGORY_MIGRATION,
    "clear failed community category migration"
  );
  await tryResolveFailedMigration(
    FAILED_MOCO_MEDIA_DONATION_MIGRATION,
    "clear failed moco media donation migration"
  );

  try {
    await runCommand(
      "prisma migrate deploy",
      "npx",
      ["prisma", "migrate", "deploy"],
      MIGRATE_TIMEOUT_MS
    );
  } catch (err) {
    console.error("[vercel-db-sync] migrate deploy failed:", err.message);
    process.exit(1);
  }

  try {
    await runCommand("prisma seed", "npx", ["tsx", "prisma/seed.ts"], SEED_TIMEOUT_MS);
  } catch (err) {
    console.warn("[vercel-db-sync] seed skipped:", err.message);
  }
}

main().catch((err) => {
  console.error("[vercel-db-sync] unexpected:", err.message);
  process.exit(1);
});
