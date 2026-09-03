import { db } from "@/lib/db";

/** Stripe Connect seller onboarding — credit-card ecosystem adult signal. */
export function hasStripeConnectAdultSignal(user: {
  stripeConnectAccountId: string | null;
  stripeConnectOnboardedAt: Date | null;
}): boolean {
  return !!(user.stripeConnectAccountId && user.stripeConnectOnboardedAt);
}

/** At least one successful Stripe (or platform) payment on record. */
export async function hasStripePaymentHistory(userId: string): Promise<boolean> {
  const paid = await db.paymentIntent.findFirst({
    where: { userId, status: "PAID" },
    select: { id: true },
  });
  return !!paid;
}

/**
 * Paid / creator flows: birthDate alone is not required when Stripe card rail is established.
 * Used alongside birthDate checks for monetized adult content.
 */
export async function hasStripeAdultEstablishment(
  userId: string,
  user?: {
    stripeCustomerId?: string | null;
    stripeConnectAccountId?: string | null;
    stripeConnectOnboardedAt?: Date | null;
  } | null
): Promise<boolean> {
  const row =
    user ??
    (await db.user.findUnique({
      where: { id: userId },
      select: {
        stripeCustomerId: true,
        stripeConnectAccountId: true,
        stripeConnectOnboardedAt: true,
      },
    }));
  if (!row) return false;
  if (hasStripeConnectAdultSignal({
    stripeConnectAccountId: row.stripeConnectAccountId ?? null,
    stripeConnectOnboardedAt: row.stripeConnectOnboardedAt ?? null,
  })) {
    return true;
  }
  if (row.stripeCustomerId) {
    return hasStripePaymentHistory(userId);
  }
  return false;
}
