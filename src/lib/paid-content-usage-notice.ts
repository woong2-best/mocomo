import type { PaymentIntentType } from "@prisma/client";

/**
 * Shown directly above the pay action for any purchase that only grants a
 * personal viewing licence. Keep the wording identical on web and mobile —
 * it is the text a takedown / criminal complaint is argued from.
 */
export const PAID_CONTENT_USAGE_NOTICE_TITLE =
  "⚠️ Payment does not transfer ownership or distribution rights for the content.";

export const PAID_CONTENT_USAGE_NOTICE_BODY =
  "This content is for personal viewing only. Unauthorized copying, recording, capture, or distribution may lead to criminal or civil liability under applicable law.";

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
