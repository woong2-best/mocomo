import { PrismaClient } from "@prisma/client";
import { ensurePlatformBootstrap } from "../src/lib/platform-bootstrap";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 MoCoMo bootstrap...");
  await ensurePlatformBootstrap(prisma);
  console.log("✅ 완료 — 광고, 이벤트, 환영 게시글");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
