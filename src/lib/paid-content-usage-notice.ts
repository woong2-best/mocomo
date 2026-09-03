import type { PaymentIntentType } from "@prisma/client";

/**
 * Shown directly above the pay action for any purchase that only grants a
 * personal viewing licence. Keep the wording identical on web and mobile —
 * it is the text a takedown / criminal complaint is argued from.
 */
export const PAID_CONTENT_USAGE_NOTICE_TITLE =
  "⚠️ 결제는 콘텐츠의 소유권 또는 유포 권한 이전을 의미하지 않습니다.";

export const PAID_CONTENT_USAGE_NOTICE_BODY =
  "본 콘텐츠는 개인적인 시청·열람 목적으로만 제공됩니다. 무단 복제·녹화·캡처·유포 시 관련 법령에 따라 형사처벌 또는 법적 책임이 발생할 수 있습니다.";

export const PAID_CONTENT_USAGE_NOTICE_TEXT = `${PAID_CONTENT_USAGE_NOTICE_TITLE}\n${PAID_CONTENT_USAGE_NOTICE_BODY}`;

/** Purchases that hand over viewable media rather than goods or credit. */
const VIEWING_LICENCE_TYPES: PaymentIntentType[] = [
  "MESSAGE_MEDIA",
  "POST_MEDIA",
  "CREATOR_EPISODE",
];

export function requiresPaidContentUsageNotice(type: PaymentIntentType): boolean {
  return VIEWING_LICENCE_TYPES.includes(type);
}
