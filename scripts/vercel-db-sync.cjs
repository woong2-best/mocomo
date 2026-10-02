/**
 * Production DB sync — migrate deploy + seed.
 *
 * Vercel: vercel-db-sync-if-needed.cjs runs this when prisma/schema or migrations changed.
 * Manual: npm run db:deploy
 *
 * Clears known failed migration state, applies pending migrations, then optional seed.
 * Bounded runtime so migrate/seed cannot hang indefinitely.
 *
 * When every migration is already recorded in `_prisma_migrations`, we skip
 * `prisma migrate deploy`. That command uses the schema engine + DIRECT_URL; redeploys
 * of the same prisma commit would otherwise hit the DB on every build even with nothing
 * to apply (and fail with opaque "Schema engine error" if DIRECT_URL is misconfigured).
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MIGRATE_TIMEOUT_MS = 4 * 60 * 1000;
const SEED_TIMEOUT_MS = 2 * 60 * 1000;
const RESOLVE_TIMEOUT_MS = 60 * 1000;

const FAILED_WATERMARK_MIGRATION = "20260816150000_watermark_forensics";
const FAILED_COMMUNITY_CATEGORY_MIGRATION = "20260904120000_community_category_v3";
const FAILED_MOCO_MEDIA_DONATION_MIGRATION = "20260921120000_moco_media_donation";
const FAILED_ON_DEMAND_WITHDRAWAL_MIGRATION = "20261002120000_moco_on_demand_withdrawal";
const FAILED_ON_DEMAND_PHASE2_MIGRATION = "20261002143000_on_demand_phase2";

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

function listDiskMigrationNames() {
  const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => /^\d{14}_/.test(name))
    .sort();
}

async function listPendingMigrationNames() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL is not set — cannot check migration status. Add it in Vercel env (Production + Preview if builds run migrate)."
    );
  }

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE rolled_back_at IS NULL
        AND finished_at IS NOT NULL
    `;
    const applied = new Set(rows.map((row) => row.migration_name));
    return listDiskMigrationNames().filter((name) => !applied.has(name));
  } finally {
    await prisma.$disconnect();
  }
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
  await tryResolveFailedMigration(
    FAILED_ON_DEMAND_WITHDRAWAL_MIGRATION,
    "clear failed on-demand withdrawal migration"
  );
  await tryResolveFailedMigration(
    FAILED_ON_DEMAND_PHASE2_MIGRATION,
    "clear failed on-demand phase2 migration"
  );

  let pending = [];
  try {
    pending = await listPendingMigrationNames();
  } catch (err) {
    console.error("[vercel-db-sync] migration status check failed:", err.message);
    process.exit(1);
  }

  if (pending.length === 0) {
    console.log(
      "[vercel-db-sync] All migrations already applied — skipping prisma migrate deploy."
    );
  } else {
    console.log(
      `[vercel-db-sync] Pending migrations (${pending.length}): ${pending.join(", ")}`
    );
    if (!process.env.DIRECT_URL?.trim()) {
      console.error(
        "[vercel-db-sync] DIRECT_URL is required to apply pending migrations (Supabase session pooler :5432, not transaction :6543). Set it in Vercel alongside DATABASE_URL."
      );
      process.exit(1);
    }

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
