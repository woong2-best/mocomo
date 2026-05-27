import { db } from "../src/lib/db";
import { ensureOperatorRole, OPERATOR_USERNAME } from "../src/lib/operator";

async function main() {
  await ensureOperatorRole(db);
  const user = await db.user.findUnique({
    where: { username: OPERATOR_USERNAME },
    select: { username: true, role: true },
  });
  console.log(user ? `OK: @${user.username} → ${user.role}` : `계정 @${OPERATOR_USERNAME} 없음 — 가입 후 다시 실행`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
