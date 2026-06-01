import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const usedListingCols = [
  "meetPlace",
  "saleType",
  "auctionEndsAt",
  "restrictedKind",
  "auctionExtensionCount",
];

const userCols = ["phoneVerified", "adultVerifiedAt", "birthDate"];

try {
  const listing = await db.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'UsedListing'
  `;
  const user = await db.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User'
  `;
  const lset = new Set(listing.map((r) => r.column_name));
  const uset = new Set(user.map((r) => r.column_name));

  console.log("--- UsedListing ---");
  for (const c of usedListingCols) {
    console.log(`${lset.has(c) ? "OK" : "MISSING"}  ${c}`);
  }
  console.log("--- User ---");
  for (const c of userCols) {
    console.log(`${uset.has(c) ? "OK" : "MISSING"}  ${c}`);
  }
} catch (e) {
  console.error("DB_ERROR:", e.message || e);
  process.exit(1);
} finally {
  await db.$disconnect();
}
