/**
 * 운영자 ADMIN 부여 (명시적 1회 실행 — 대기업 IAM/ break-glass 패턴).
 *
 *   npx tsx scripts/set-operator.ts
 *
 * Vercel: SITE_OPERATOR_USERNAME, (선택) SITE_OPERATOR_EMAIL
 */
import { db } from "../src/lib/db";
import {
  bootstrapOperatorRole,
  getOperatorEmails,
  getOperatorUsername,
  getOperatorUsernames,
} from "../src/lib/operator";

async function main() {
  const username = getOperatorUsername();
  console.log(`운영자 부트스트랩: @${username}`);

  const result = await bootstrapOperatorRole(db);

  if (!result.ok && result.reason === "operator_email_mismatch") {
    console.error(
      `계정 @${username} 의 이메일이 SITE_OPERATOR_EMAIL 과 일치하지 않습니다. Vercel 환경 변수를 확인하세요.`
    );
  }

  const user = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { username: true, role: true, email: true },
  });

  console.log(
    user
      ? `OK: @${user.username} → ${user.role}${result.demoted ? ` (다른 ADMIN ${result.demoted}명 회수)` : ""}`
      : `완료 (demoted=${result.demoted})`
  );

  const emails = getOperatorEmails();
  const emailUsers = await db.user.findMany({
    where: {
      OR: emails.map((email) => ({ email: { equals: email, mode: "insensitive" as const } })),
    },
    select: { id: true, username: true, role: true, email: true },
  });
  for (const emailUser of emailUsers) {
    console.log(`OK: ${emailUser.email} (@${emailUser.username}) → ${emailUser.role}`);
  }
  const foundEmails = new Set(emailUsers.map((u) => u.email?.trim().toLowerCase()));
  for (const email of emails) {
    if (!foundEmails.has(email)) {
      console.error(`이메일 ${email} 로 가입된 계정이 없습니다.`);
    }
  }

  const operatorUsers = await db.user.findMany({
    where: {
      OR: [
        ...getOperatorUsernames().map((name) => ({
          username: { equals: name, mode: "insensitive" as const },
        })),
        ...emails.map((email) => ({ email: { equals: email, mode: "insensitive" as const } })),
      ],
    },
    select: { id: true, username: true },
  });
  for (const operator of operatorUsers) {
    await db.adminAuthLockout.updateMany({
      where: { userId: operator.id },
      data: { failCount: 0, lockedUntil: null },
    });
    const passkeys = await db.adminWebAuthnCredential.findMany({
      where: { userId: operator.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, lastUsedAt: true, createdAt: true },
    });
    if (passkeys.length <= 1) continue;
    const keep = [...passkeys].sort((a, b) => {
      const used = (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0);
      if (used !== 0) return used;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })[0]!;
    const removed = await db.adminWebAuthnCredential.deleteMany({
      where: { userId: operator.id, id: { not: keep.id } },
    });
    console.log(`@${operator.username} 패스키 ${removed.count}개 정리, 1개만 유지`);
  }

  if (!result.ok && result.reason === "operator_account_missing") {
    console.error(`운영자 username 또는 이메일 계정이 없습니다. 회원가입 후 다시 실행하세요.`);
    process.exit(1);
  }
  if (!result.ok && result.reason === "operator_email_mismatch") {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
