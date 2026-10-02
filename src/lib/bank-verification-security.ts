import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { checkRateLimit, authLimiter } from "@/lib/ratelimit";
import { ipFingerprint } from "@/lib/bank-account-fingerprint";

const BANK_SEND_USER_DAY = 3;
const BANK_SEND_ACCOUNT_DAY = 3;
const BANK_SEND_IP_DAY = 15;
const BANK_VERIFY_FAIL_MAX = 5;
const BANK_VERIFY_FAIL_TTL_MS = 15 * 60 * 1000;

function kstDateKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function endOfKstDay(d = new Date()): Date {
  return new Date(`${kstDateKey(d)}T14:59:59.999Z`);
}

async function countRate(identifier: string): Promise<number> {
  return db.verificationToken.count({
    where: { identifier, expires: { gt: new Date() } },
  });
}

async function recordRate(identifier: string, expires: Date): Promise<void> {
  await db.verificationToken.create({
    data: {
      identifier,
      token: `evt-${Date.now()}-${randomBytes(4).toString("hex")}`,
      expires,
    },
  });
}

async function enforceDaily(scope: string, key: string, max: number, msg: string) {
  const identifier = `rate:bank:${scope}:${key}:${kstDateKey()}`;
  const count = await countRate(identifier);
  if (count >= max) return { ok: false as const, error: msg };
  await recordRate(identifier, endOfKstDay());
  return { ok: true as const, remaining: max - count - 1 };
}

export async function checkBankSendRateLimit(input: {
  userId: string;
  accountFingerprint: string;
  ip: string;
}) {
  const msg = `Please sign in to continue. ${BANK_SEND_USER_DAY}번까지만 요청할 수 있습니다. 내일 다시 시도해 주세요.`;

  const byUser = await enforceDaily("send-user", input.userId, BANK_SEND_USER_DAY, msg);
  if (!byUser.ok) return byUser;

  const byAccount = await enforceDaily(
    "send-acct",
    input.accountFingerprint,
    BANK_SEND_ACCOUNT_DAY,
    "No more verification requests for this account today."
  );
  if (!byAccount.ok) return byAccount;

  const ipKey = ipFingerprint(input.ip);
  const byIp = await enforceDaily(
    "send-ip",
    ipKey,
    BANK_SEND_IP_DAY,
    "Too many requests. Please try again in a moment."
  );
  if (!byIp.ok) return byIp;

  if (authLimiter && input.ip !== "unknown") {
    const { success } = await checkRateLimit(authLimiter, `bank-send-ip:${input.ip}`);
    if (!success) {
      return { ok: false as const, error: "Too many requests. Please try again in a moment." };
    }
  }

  return {
    ok: true as const,
    remaining: Math.min(byUser.remaining, byAccount.remaining, byIp.remaining),
  };
}

function verifyFailIdentifier(userId: string, accountFingerprint: string) {
  return `bank-verify-fail:${userId}:${accountFingerprint}`;
}

export async function recordBankVerifyFailure(userId: string, accountFingerprint: string) {
  const identifier = verifyFailIdentifier(userId, accountFingerprint);
  await db.verificationToken.create({
    data: {
      identifier,
      token: "fail",
      expires: new Date(Date.now() + BANK_VERIFY_FAIL_TTL_MS),
    },
  });
}

export async function clearBankVerifyFailures(userId: string, accountFingerprint: string) {
  await db.verificationToken.deleteMany({
    where: { identifier: verifyFailIdentifier(userId, accountFingerprint) },
  });
}

export async function checkBankVerifyAttemptLimit(userId: string, accountFingerprint: string) {
  const identifier = verifyFailIdentifier(userId, accountFingerprint);
  const fails = await countRate(identifier);
  if (fails >= BANK_VERIFY_FAIL_MAX) {
    return {
      ok: false as const,
      error: "Too many verification attempts. Request 1-won verification again.",
    };
  }
  return { ok: true as const, remaining: BANK_VERIFY_FAIL_MAX - fails };
}
