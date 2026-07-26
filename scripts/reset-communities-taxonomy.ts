/**
 * RETIRED — do not run in vercel-build.
 *
 * Originally a one-shot wipe for CommunityCategory taxonomy v2.
 * That migration is done; re-running deleteMany wiped user communities on deploy
 * whenever the marker table was missing (preview DBs, restores, etc.).
 *
 * Kept as a no-op so any leftover CI/docs references fail safely.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MARKER = "community-taxonomy-v2";

async function main() {
  console.warn(
    "[reset-communities] RETIRED — refusing to delete communities. " +
      "Remove this script from any deploy pipeline if still referenced."
  );

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_mocomo_migrations" (
        id TEXT PRIMARY KEY,
        done_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "_mocomo_migrations" (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      MARKER
    );
    console.log(`[reset-communities] ensured marker ${MARKER} (no deletes)`);
  } catch (e) {
    console.error("[reset-communities] marker ensure failed (ignored)", e);
  }
}

main()
  .catch((e) => {
    console.error("[reset-communities]", e);
    process.exitCode = 0;
  })
  .finally(() => prisma.$disconnect());
