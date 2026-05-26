import crypto from "crypto";
import { formatKrPhoneDisplay } from "@/lib/phone";

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

/** Solapi SMS (미설정 시 개발 환경에서만 콘솔 로그) */
export async function sendAuthSms(phoneE164: string, code: string): Promise<SendSmsResult> {
  const display = formatKrPhoneDisplay(phoneE164);
  const message = `[MoCoMo] 중고거래 인증번호: ${code} (3분 내 입력)`;
  const from = process.env.SOLAPI_SENDER_PHONE?.trim();
  const auth = solapiAuthorization();

  if (!auth || !from) {
    if (process.env.NODE_ENV === "development" || process.env.SMS_DEV_LOG === "true") {
      console.info(`[SMS dev] ${display} → ${code}`);
      return { ok: true, dev: true };
    }
    return {
      ok: false,
      error: "SMS 발송 설정이 없습니다. SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_PHONE을 설정해 주세요.",
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
        message: {
          to,
          from,
          text: message,
        },
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
