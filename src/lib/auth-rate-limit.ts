import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { checkRateLimit, authLimiter } from "@/lib/ratelimit";

const PHONE_SMS_PER_DAY = 3;
const EMAIL_SENDS_PER_HOUR = 5;
const EMAIL_SENDS_PER_DAY = 10;
const EMAIL_COOLDOWN_SEC = 60;

function kstDateKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function kstHourKey(d = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 13);
}

function endOfKstDay(d = new Date()): Date {
  const key = kstDateKey(d);
  return new Date(`${key}T14:59:59.999Z`);
}

async function countDbRateEvents(identifier: string): Promise<number> {
  return db.verificationToken.count({
    where: { identifier, expires: { gt: new Date() } },
  });
}

async function recordDbRateEvent(identifier: string, expires: Date): Promise<void> {
  await db.verificationToken.create({
    data: {
      identifier,
      token: `evt-${Date.now()}-${randomBytes(4).toString("hex")}`,
      expires,
    },
  });
}

async function enforceDbDailyLimit(
  scope: string,
  key: string,
  max: number,
  errorMessage: string
): Promise<{ ok: true; remaining: number } | { ok: false; error: string }> {
  const identifier = `rate:${scope}:${key}:${kstDateKey()}`;
  const count = await countDbRateEvents(identifier);
  if (count >= max) return { ok: false, error: errorMessage };
  await recordDbRateEvent(identifier, endOfKstDay());
  return { ok: true, remaining: max - count - 1 };
}

async function enforceDbHourlyLimit(
  scope: string,
  key: string,
  max: number,
  errorMessage: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const identifier = `rate:${scope}:${key}:${kstHourKey()}`;
  const count = await countDbRateEvents(identifier);
  if (count >= max) return { ok: false, error: errorMessage };
  const expires = new Date(Date.now() + 65 * 60 * 1000);
  await recordDbRateEvent(identifier, expires);
  return { ok: true };
}

async function enforceEmailCooldown(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const identifier = `rate:email-cooldown:${email}`;
  const row = await db.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (row && row.expires > new Date()) {
    return {
      ok: false,
      error: `잠시 후 다시 시도해 주세요. (${EMAIL_COOLDOWN_SEC}초 간격)`,
    };
  }
  await db.verificationToken.deleteMany({ where: { identifier } });
  await recordDbRateEvent(identifier, new Date(Date.now() + EMAIL_COOLDOWN_SEC * 1000));
  return { ok: true };
}

/** 휴대폰 SMS: 계정·번호 각 하루 3회 */
export async function checkPhoneSmsRateLimit(userId: string, phoneE164: string) {
  const msg = `휴대폰 인증번호는 하루에 ${PHONE_SMS_PER_DAY}번까지만 요청할 수 있습니다. 내일 다시 시도해 주세요.`;

  const byUser = await enforceDbDailyLimit("phone-sms-user", userId, PHONE_SMS_PER_DAY, msg);
  if (!byUser.ok) return byUser;

  const byPhone = await enforceDbDailyLimit("phone-sms-phone", phoneE164, PHONE_SMS_PER_DAY, msg);
  if (!byPhone.ok) return byPhone;

  return {
    ok: true as const,
    remaining: Math.min(byUser.remaining, byPhone.remaining),
  };
}

/** 이메일 인증 코드 발송 제한 + IP(Upstash) */
export async function checkEmailSendRateLimit(email: string, ip: string) {
  const normalized = email.trim().toLowerCase();

  const cooldown = await enforceEmailCooldown(normalized);
  if (!cooldown.ok) return cooldown;

  const hourly = await enforceDbHourlyLimit(
    "email-send",
    normalized,
    EMAIL_SENDS_PER_HOUR,
    "이메일 인증 요청이 너무 많습니다. 1시간 후 다시 시도해 주세요."
  );
  if (!hourly.ok) return hourly;

  const daily = await enforceDbDailyLimit(
    "email-send-day",
    normalized,
    EMAIL_SENDS_PER_DAY,
    "오늘 이메일 인증 요청 한도를 초과했습니다. 내일 다시 시도해 주세요."
  );
  if (!daily.ok) return daily;

  if (authLimiter && ip !== "unknown") {
    const ipCheck = await checkRateLimit(authLimiter, `email-ip:${ip}`);
    if (!ipCheck.success) {
      return { ok: false as const, error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
    }
  }

  return { ok: true as const };
}
