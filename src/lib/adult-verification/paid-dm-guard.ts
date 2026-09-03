import type { PaymentIntentType } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessPaidAdultContent } from "@/lib/nsfw-viewer-access";
import { ADULT_MIN_AGE } from "@/lib/adult-verification/constants";

const ADULT_GATED_PAYMENT_TYPES = new Set<PaymentIntentType>(["MESSAGE_MEDIA", "CALL_BOOKING"]);

export const PAID_ADULT_ACCESS_REQUIRED_MSG = `유료 콘텐츠는 만 ${ADULT_MIN_AGE}세 이상(생년월일 등록) 또는 신용카드 결제 이력이 있는 계정만 이용할 수 있습니다.`;

export async function assertAdultVerifiedForPaidDm(
  userId: string
): Promise<{ error: string; code: "ADULT_VERIFICATION_REQUIRED" } | null> {
  const ok = await canAccessPaidAdultContent(userId);
  if (ok) return null;
  return { error: PAID_ADULT_ACCESS_REQUIRED_MSG, code: "ADULT_VERIFICATION_REQUIRED" };
}

export function paymentTypeRequiresAdultVerification(type: PaymentIntentType): boolean {
  return ADULT_GATED_PAYMENT_TYPES.has(type);
}
