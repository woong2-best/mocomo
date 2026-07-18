import crypto from "crypto";
import { formatPhoneDisplay } from "@/lib/phone-international";
import {
  isSolapiConfigured,
  isTwilioConfigured,
  type SmsProvider,
} from "@/lib/sms/sms-provider";

export type { SmsProvider, SmsProviderId } from "@/lib/sms/sms-provider";
export { isSolapiConfigured, isTwilioConfigured } from "@/lib/sms/sms-provider";

function solapiAuthorization(): string | null {
  const apiKey = process.env.SOLAPI_API_KEY?.trim();
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim();
  if (!apiKey || !apiSecret) return null;

  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 ApiKey=${apiKey}, Date=${date}, salt=${salt}, signature=${signature}`;
}

export type SendSmsResult =
  | { ok: true; dev?: boolean }
  | { ok: false; error: string };

function isKrPhone(phoneE164: string) {
  return phoneE164.startsWith("+82");
}

async function sendKrSmsViaSolapi(phoneE164: string, text: string): Promise<SendSmsResult> {
  const from = process.env.SOLAPI_SENDER_PHONE?.trim();
  const auth = solapiAuthorization();

  if (!auth || !from) {
    if (process.env.NODE_ENV === "development" || process.env.SMS_DEV_LOG === "true") {
      console.info(`[SMS dev KR] ${formatPhoneDisplay(phoneE164)} → ${text}`);
      return { ok: true, dev: true };
    }
    return {
      ok: false,
      error:
        "SMS 발송 설정이 없습니다. SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_PHONE을 설정해 주세요.",
    };
  }

  const to = phoneE164.replace(/^\+82/, "0");
  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: { to, from, text },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: body || `SMS 발송 실패 (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMS 발송 오류" };
  }
}

async function sendIntlSmsViaTwilio(phoneE164: string, text: string): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();

  if (!accountSid || !authToken || !from) {
    if (process.env.NODE_ENV === "development" || process.env.SMS_DEV_LOG === "true") {
      console.info(`[SMS dev intl] ${formatPhoneDisplay(phoneE164)} → ${text}`);
      return { ok: true, dev: true };
    }
    return {
      ok: false,
      error:
        "해외 SMS 설정이 없습니다. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER을 설정해 주세요.",
    };
  }

  try {
    const body = new URLSearchParams({
      To: phoneE164,
      From: from,
      Body: text,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { ok: false, error: errBody || `SMS 발송 실패 (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMS 발송 오류" };
  }
}

function createSolapiProvider(): SmsProvider {
  return {
    id: "solapi-kr",
    canSend: (phone) => isKrPhone(phone) && (isSolapiConfigured() || isDevSmsFallback()),
    send: (phone, text) => sendKrSmsViaSolapi(phone, text),
  };
}

function createTwilioProvider(): SmsProvider {
  return {
    id: "twilio-intl",
    canSend: (phone) => !isKrPhone(phone) && (isTwilioConfigured() || isDevSmsFallback()),
    send: (phone, text) => sendIntlSmsViaTwilio(phone, text),
  };
}

function isDevSmsFallback() {
  return process.env.NODE_ENV === "development" || process.env.SMS_DEV_LOG === "true";
}

/** Provider 목록 — 해외 Twilio 미설정이어도 한국 Solapi는 독립 동작 */
export function getSmsProviders(): SmsProvider[] {
  return [createSolapiProvider(), createTwilioProvider()];
}

export function resolveSmsProvider(phoneE164: string): SmsProvider | null {
  return getSmsProviders().find((p) => p.canSend(phoneE164)) ?? null;
}

/** Solapi(한국) · Twilio(해외) — 미설정 시 개발 환경에서만 콘솔 로그 */
export async function sendAuthSms(phoneE164: string, code: string): Promise<SendSmsResult> {
  const text = `[MoCoMo] 인증번호: ${code} (3분 내 입력)`;
  const provider = resolveSmsProvider(phoneE164);
  if (!provider) {
    if (isKrPhone(phoneE164)) {
      return sendKrSmsViaSolapi(phoneE164, text);
    }
    // 해외: Twilio 없어도 가입 플로우는 SMS를 호출하지 않음. 직접 호출 시에만 soft-fail.
    return {
      ok: false,
      error:
        "해외 SMS Provider가 설정되지 않았습니다. 해외 판매자는 휴대폰 인증 없이 가입할 수 있습니다.",
    };
  }
  return provider.send(phoneE164, text);
}
