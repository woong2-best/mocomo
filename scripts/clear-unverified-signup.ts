/**
 * 미인증 가입 계정 삭제 (가입 막힘 해제)
 * 사용: npx tsx scripts/clear-unverified-signup.ts websaiteujejag@gmail.com
 */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("사용법: npx tsx scripts/clear-unverified-signup.ts <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.$queryRaw<
    { id: string; email: string | null; username: string; emailVerified: Date | null }[]
  >`
    SELECT id, email, username, "emailVerified"
    FROM "User"
    WHERE email IS NOT NULL AND LOWER(TRIM(email)) = ${email}
  `;

  if (users.length === 0) {
    console.log("해당 이메일 계정 없음 — 이미 삭제됐거나 다른 이메일일 수 있습니다.");
    return;
  }

  for (const u of users) {
    console.log(`- id=${u.id} username=${u.username} verified=${!!u.emailVerified}`);
    if (u.emailVerified) {
      console.log("  → 인증 완료 계정은 삭제하지 않습니다. 로그인/비밀번호 찾기를 이용하세요.");
      continue;
    }
    await prisma.user.delete({ where: { id: u.id } });
    console.log("  → 미인증 계정 삭제 완료");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
