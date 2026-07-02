import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { checkRateLimit, authLimiter } from "@/lib/ratelimit";

const PHONE_SMS_PER_DAY = 3;
const EMAIL_SENDS_PER_HOUR = 5;
const EMAIL_SENDS_PER_DAY = 10;
const EMAIL_COOLDOWN_SEC = 60;
const LOGIN_ATTEMPTS_PER_15MIN = 12;

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

async function readEmailCooldown(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
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
  return { ok: true };
}

async function writeEmailCooldown(email: string): Promise<void> {
  const identifier = `rate:email-cooldown:${email}`;
  await db.verificationToken.deleteMany({ where: { identifier } });
  await recordDbRateEvent(identifier, new Date(Date.now() + EMAIL_COOLDOWN_SEC * 1000));
}

async function canEnforceDbHourlyLimit(
  scope: string,
  key: string,
  max: number,
  errorMessage: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const identifier = `rate:${scope}:${key}:${kstHourKey()}`;
  const count = await countDbRateEvents(identifier);
  if (count >= max) return { ok: false, error: errorMessage };
  return { ok: true };
}

async function writeDbHourlyLimit(scope: string, key: string): Promise<void> {
  const identifier = `rate:${scope}:${key}:${kstHourKey()}`;
  const expires = new Date(Date.now() + 65 * 60 * 1000);
  await recordDbRateEvent(identifier, expires);
}

async function canEnforceDbDailyLimit(
  scope: string,
  key: string,
  max: number,
  errorMessage: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const identifier = `rate:${scope}:${key}:${kstDateKey()}`;
  const count = await countDbRateEvents(identifier);
  if (count >= max) return { ok: false, error: errorMessage };
  return { ok: true };
}

async function writeDbDailyLimit(scope: string, key: string): Promise<void> {
  const identifier = `rate:${scope}:${key}:${kstDateKey()}`;
  await recordDbRateEvent(identifier, endOfKstDay());
}

/** 이메일 인증 코드 발송 제한 확인 (발송 전 — 카운트 증가 없음) */
export async function checkEmailSendRateLimit(email: string, ip: string) {
  const normalized = email.trim().toLowerCase();

  const cooldown = await readEmailCooldown(normalized);
  if (!cooldown.ok) return cooldown;

  const hourly = await canEnforceDbHourlyLimit(
    "email-send",
    normalized,
    EMAIL_SENDS_PER_HOUR,
    "이메일 인증 요청이 너무 많습니다. 1시간 후 다시 시도해 주세요."
  );
  if (!hourly.ok) return hourly;

  const daily = await canEnforceDbDailyLimit(
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

/** 이메일 발송 성공 후 호출 */
export async function recordEmailSendRateLimit(email: string, ip: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await Promise.all([
    writeEmailCooldown(normalized),
    writeDbHourlyLimit("email-send", normalized),
    writeDbDailyLimit("email-send-day", normalized),
    authLimiter && ip !== "unknown" ? authLimiter.limit(`email-ip:${ip}`) : Promise.resolve(),
  ]);
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

function loginWindowKey(): string {
  const d = new Date();
  const slot = Math.floor(d.getTime() / (15 * 60 * 1000));
  return String(slot);
}

/** 로그인·비밀번호 시도 무차별 대입 방지 */
export async function checkLoginRateLimit(
  email: string,
  ip: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  const window = loginWindowKey();
  const msg = "로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.";

  if (authLimiter) {
    const checks = await Promise.all([
      ip !== "unknown"
        ? checkRateLimit(authLimiter, `login-ip:${ip}`)
        : Promise.resolve({ success: true }),
      checkRateLimit(authLimiter, `login-email:${normalized}`),
    ]);
    if (!checks[0].success || !checks[1].success) {
      return { ok: false, error: msg };
    }
    return { ok: true };
  }

  const ipScope = `login-ip:${ip}:${window}`;
  const emailScope = `login-email:${normalized}:${window}`;
  const [ipCount, emailCount] = await Promise.all([
    countDbRateEvents(ipScope),
    countDbRateEvents(emailScope),
  ]);
  if (ipCount >= LOGIN_ATTEMPTS_PER_15MIN || emailCount >= 8) {
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function recordLoginAttempt(email: string, ip: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const window = loginWindowKey();
  const expires = new Date(Date.now() + 16 * 60 * 1000);

  if (authLimiter) {
    await Promise.all([
      ip !== "unknown" ? authLimiter.limit(`login-ip:${ip}`) : Promise.resolve(),
      authLimiter.limit(`login-email:${normalized}`),
    ]);
    return;
  }

  await Promise.all([
    recordDbRateEvent(`login-ip:${ip}:${window}`, expires),
    recordDbRateEvent(`login-email:${normalized}:${window}`, expires),
  ]);
}
