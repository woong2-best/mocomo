/**
 * 운영자가 아닌 ADMIN/MODERATOR 권한만 회수 (승격 없음).
 * 배포·보안 점검 시: OPERATOR_REVOKE_ON_DEPLOY=true 또는 수동 실행.
 */
import { db } from "../src/lib/db";
import { getOperatorUsername, revokeUnauthorizedAdminRoles } from "../src/lib/operator";

async function main() {
  const demoted = await revokeUnauthorizedAdminRoles(db);
  console.log(`@${getOperatorUsername()} 외 ADMIN/MODERATOR ${demoted}명 → USER`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
