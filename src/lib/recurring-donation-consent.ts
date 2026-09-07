import { db } from "@/lib/db";
import {
  buildRecurringDonationTermsSnapshot,
  RECURRING_DONATION_TERMS_REQUIRED_ERROR,
  RECURRING_DONATION_TERMS_VERSION,
} from "@/lib/recurring-donation-terms";

export async function assertAndRecordRecurringDonationConsent(input: {
  userId: string;
  paymentIntentId: string;
  accepted: boolean;
}): Promise<{ error?: string }> {
  const intent = await db.paymentIntent.findUnique({
    where: { id: input.paymentIntentId },
    select: { id: true, userId: true, recurringDonationTermsAcceptedAt: true },
  });

  if (!intent || intent.userId !== input.userId) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }

  if (intent.recurringDonationTermsAcceptedAt) {
    return {};
  }

  if (!input.accepted) {
    return { error: RECURRING_DONATION_TERMS_REQUIRED_ERROR };
  }

  await db.paymentIntent.update({
    where: { id: input.paymentIntentId },
    data: {
      recurringDonationTermsVersion: RECURRING_DONATION_TERMS_VERSION,
      recurringDonationTermsAcceptedAt: new Date(),
      recurringDonationTermsSnapshot: buildRecurringDonationTermsSnapshot(),
    },
  });

  return {};
}

export async function assertRecurringDonationConsentRecorded(
  userId: string,
  paymentIntentId: string
): Promise<{ error?: string }> {
  const intent = await db.paymentIntent.findUnique({
    where: { id: paymentIntentId },
    select: { userId: true, recurringDonationTermsAcceptedAt: true },
  });
  if (!intent || intent.userId !== userId) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }
  if (!intent.recurringDonationTermsAcceptedAt) {
    return { error: RECURRING_DONATION_TERMS_REQUIRED_ERROR };
  }
  return {};
}
