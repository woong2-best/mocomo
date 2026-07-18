import type { SendSmsResult } from "@/lib/sms";

/**
 * SMS Provider 인터페이스 — 향후 Twilio 등 해외 SMS 확장용.
 * 미설정 시 해외 발송은 실패하되, 판매자 가입 플로우는 해외에서 SMS를 호출하지 않음.
 */
export type SmsProviderId = "solapi-kr" | "twilio-intl" | "dev-log";

export interface SmsProvider {
  id: SmsProviderId;
  /** 해당 번호로 발송 가능한지 (환경변수·지역) */
  canSend(phoneE164: string): boolean;
  send(phoneE164: string, text: string): Promise<SendSmsResult>;
}

export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_FROM_NUMBER?.trim()
  );
}

export function isSolapiConfigured(): boolean {
  return !!(
    process.env.SOLAPI_API_KEY?.trim() &&
    process.env.SOLAPI_API_SECRET?.trim() &&
    process.env.SOLAPI_SENDER_PHONE?.trim()
  );
}
