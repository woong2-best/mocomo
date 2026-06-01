import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const expected = [
  { table: "User", column: "adultVerifiedAt" },
  { table: "User", column: "birthDate" },
  { table: "UsedListing", column: "restrictedKind" },
];

try {
  const rows = await db.$queryRaw`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'User' AND column_name IN ('adultVerifiedAt', 'birthDate'))
        OR (table_name = 'UsedListing' AND column_name = 'restrictedKind')
      )
  `;

  const found = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));

  for (const { table, column } of expected) {
    const key = `${table}.${column}`;
    console.log(`${found.has(key) ? "OK" : "MISSING"}  ${key}`);
  }

  const auction = await db.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'UsedAuctionBid'
    ) AS exists
  `;
  console.log(
    `${auction[0]?.exists ? "OK" : "MISSING"}  UsedAuctionBid (table)`
  );
} catch (e) {
  console.error("DB_ERROR:", e.message || e);
  process.exit(1);
} finally {
  await db.$disconnect();
}
