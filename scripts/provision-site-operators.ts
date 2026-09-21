/**
 * 운영자 2계정(mocomocompany, admin) 프로비저닝 + MOCO 테스트 크레딧
 *
 *   OPERATOR_ADMIN_PASSWORD='...' npx tsx scripts/provision-site-operators.ts
 *   OPERATOR_MOCO_GRANT=100  (기본 100)
 *   OPERATOR_MOCO_GRANT_TO=mocomocompany  (쉼표 구분 또는 all → SITE_OPERATOR_USERNAMES 전원)
 *   OPERATOR_GRANT_ONLY=1  — MOCO만 지급 (비밀번호·bootstrap 생략)
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
const MOCO_GRANT_TO_RAW = (process.env.OPERATOR_MOCO_GRANT_TO ?? "mocomocompany").trim().toLowerCase();
const GRANT_ONLY = process.env.OPERATOR_GRANT_ONLY === "1";

function resolveMocoGrantTargets(): string[] {
  if (MOCO_GRANT_TO_RAW === "all") return getOperatorUsernames();
  return MOCO_GRANT_TO_RAW.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

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

async function grantMocoToUsernames(usernames: string[]) {
  for (const un of usernames) {
    const grantUser = await db.user.findFirst({
      where: { username: { equals: un, mode: "insensitive" } },
      select: { id: true, username: true },
    });
    if (!grantUser) {
      console.error(`MOCO 지급 대상 @${un} 없음`);
      continue;
    }
    console.log(`@${grantUser.username} …`);
    await grantMoco(grantUser.id, MOCO_GRANT);
  }
}

async function main() {
  const targets = resolveMocoGrantTargets();
  console.log("운영자 username 목록:", getOperatorUsernames().join(", "));
  console.log("MOCO 지급 대상:", targets.join(", "));

  if (GRANT_ONLY) {
    await grantMocoToUsernames(targets);
    return;
  }

  const password = process.env.OPERATOR_ADMIN_PASSWORD?.trim();
  if (!password || password.length < 10) {
    console.error("OPERATOR_ADMIN_PASSWORD 환경 변수(10자 이상)가 필요합니다.");
    process.exit(1);
  }

  await ensureAdminUser(password);
  const boot = await bootstrapOperatorRole(db);
  if (!boot.ok) {
    console.warn("bootstrap 경고:", boot.reason ?? "unknown");
  } else {
    console.log(`bootstrap OK (demoted=${boot.demoted}, promoted=${boot.promoted})`);
  }

  await grantMocoToUsernames(targets);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
