import { PrismaClient } from "@prisma/client";
import { ensurePlatformBootstrap } from "../src/lib/platform-bootstrap";
import { revokeUnauthorizedAdminRoles } from "../src/lib/operator";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 MoCoMo bootstrap...");
  await ensurePlatformBootstrap(prisma);
  if (process.env.OPERATOR_REVOKE_ON_DEPLOY === "true") {
    const demoted = await revokeUnauthorizedAdminRoles(prisma);
    if (demoted > 0) console.log(`🔒 운영자 외 ADMIN ${demoted}명 권한 회수`);
  }
  console.log("✅ 완료 — 광고, 이벤트, 환영 게시글");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
