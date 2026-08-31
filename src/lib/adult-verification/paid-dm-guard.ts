import type { PaymentIntentType } from "@prisma/client";
import { db } from "@/lib/db";
import { assertAdultVerified } from "./is-verified";

const ADULT_GATED_PAYMENT_TYPES = new Set<PaymentIntentType>(["MESSAGE_MEDIA", "CALL_BOOKING"]);

export async function assertAdultVerifiedForPaidDm(
  userId: string
): Promise<{ error: string; code: "ADULT_VERIFICATION_REQUIRED" } | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { adultVerifiedAt: true },
  });
  const block = assertAdultVerified(user ?? { adultVerifiedAt: null });
  if (block) return { error: block, code: "ADULT_VERIFICATION_REQUIRED" };
  return null;
}

export function paymentTypeRequiresAdultVerification(type: PaymentIntentType): boolean {
  return ADULT_GATED_PAYMENT_TYPES.has(type);
}
