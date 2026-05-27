/**
 * 운영자 ADMIN 부여 (명시적 1회 실행 — 대기업 IAM/ break-glass 패턴).
 *
 *   npx tsx scripts/set-operator.ts
 *
 * Vercel: SITE_OPERATOR_USERNAME, (선택) SITE_OPERATOR_EMAIL
 */
import { db } from "../src/lib/db";
import { bootstrapOperatorRole, getOperatorUsername } from "../src/lib/operator";

async function main() {
  const username = getOperatorUsername();
  console.log(`운영자 부트스트랩: @${username}`);

  const result = await bootstrapOperatorRole(db);

  if (!result.ok) {
    if (result.reason === "operator_account_missing") {
      console.error(`계정 @${username} 이(가) 없습니다. 해당 닉네임으로 회원가입한 뒤 다시 실행하세요.`);
      process.exit(1);
    }
    if (result.reason === "operator_email_mismatch") {
      console.error(
        `계정 @${username} 의 이메일이 SITE_OPERATOR_EMAIL 과 일치하지 않습니다. Vercel 환경 변수를 확인하세요.`
      );
      process.exit(1);
    }
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
