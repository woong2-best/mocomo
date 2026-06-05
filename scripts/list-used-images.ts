import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const rows = await db.usedListing.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, title: true, images: true },
  });
  for (const r of rows) {
    console.log(r.title, "=>", JSON.stringify(r.images));
  }
}

main()
  .finally(() => db.$disconnect());
