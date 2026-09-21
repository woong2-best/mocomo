/**
 * 운영자 2계정(mocomocompany, admin) 프로비저닝 + MOCO 테스트 크레딧
 *
 *   OPERATOR_ADMIN_PASSWORD='...' npx tsx scripts/provision-site-operators.ts
 *   OPERATOR_MOCO_GRANT=100  (기본 100, @mocomocompany 에 지급)
 */
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "../src/lib/db";
import { bootstrapOperatorRole } from "../src/lib/operator";
import { getOperatorUsernames } from "../src/lib/operator-config";
import { syncUserGemBalance } from "../src/lib/gems/balance";

const SIGNUP_BCRYPT_ROUNDS = 12;
const ADMIN_USERNAME = "admin";
const MOCO_GRANT = Math.max(0, parseInt(process.env.OPERATOR_MOCO_GRANT ?? "100", 10) || 100);
const MOCO_GRANT_TO = (process.env.OPERATOR_MOCO_GRANT_TO ?? "mocomocompany").trim().toLowerCase();

async function grantMoco(userId: string, amount: number) {
  if (amount <= 0) return;
  await db.gemPurchase.create({
    data: {
      fanId: userId,
      krwAmount: 0,
      gems: amount,
      remainingGems: amount,
      pricePerGemUsd: 0,
      stripePaymentIntentId: `operator_grant_${randomUUID()}`,
    },
  });
  const balance = await syncUserGemBalance(userId);
  console.log(`MOCO ${amount} 지급 → 잔액 ${balance}`);
}

async function ensureAdminUser(password: string) {
  const existing = await db.user.findFirst({
    where: { username: { equals: ADMIN_USERNAME, mode: "insensitive" } },
    select: { id: true, username: true },
  });
  if (existing) {
    const passwordHash = await bcrypt.hash(password, SIGNUP_BCRYPT_ROUNDS);
    await db.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: "OWNER", adminDisabledAt: null, emailVerified: new Date() },
    });
    console.log(`@${existing.username} 비밀번호·OWNER 갱신`);
    return existing.id;
  }

  const passwordHash = await bcrypt.hash(password, SIGNUP_BCRYPT_ROUNDS);
  const email = `admin+${randomUUID().slice(0, 8)}@mocomo.internal`;
  const created = await db.user.create({
    data: {
      username: ADMIN_USERNAME,
      email,
      passwordHash,
      role: "OWNER",
      emailVerified: new Date(),
      name: "MoCoMo Admin",
    },
    select: { id: true, username: true },
  });
  console.log(`@${created.username} 계정 생성 (${email})`);
  return created.id;
}

async function main() {
  const password = process.env.OPERATOR_ADMIN_PASSWORD?.trim();
  if (!password || password.length < 10) {
    console.error("OPERATOR_ADMIN_PASSWORD 환경 변수(10자 이상)가 필요합니다.");
    process.exit(1);
  }

  console.log("운영자 username 목록:", getOperatorUsernames().join(", "));

  await ensureAdminUser(password);
  const boot = await bootstrapOperatorRole(db);
  if (!boot.ok) {
    console.warn("bootstrap 경고:", boot.reason ?? "unknown");
  } else {
    console.log(`bootstrap OK (demoted=${boot.demoted}, promoted=${boot.promoted})`);
  }

  const grantUser = await db.user.findFirst({
    where: { username: { equals: MOCO_GRANT_TO, mode: "insensitive" } },
    select: { id: true, username: true },
  });
  if (!grantUser) {
    console.error(`MOCO 지급 대상 @${MOCO_GRANT_TO} 없음`);
  } else {
    await grantMoco(grantUser.id, MOCO_GRANT);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
