import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { db } from "@/lib/db";
import { splitPlatformFee } from "@/lib/settlement";

export async function fulfillCreatorSubscriptionPurchase(
  subscriberId: string,
  creatorId: string,
  amount: number,
  paymentIntentId: string,
  stripeSubscriptionId?: string
) {
  const creator = await db.user.findUnique({
    where: { id: creatorId },
    select: { id: true, username: true, creatorSubscriptionPriceKrw: true },
  });
  if (!creator) return { error: t("actions.sbsk5n5") };
  if (creator.id === subscriberId) return { error: t("actions.s1ahhnm") };
  if (creator.creatorSubscriptionPriceKrw !== amount) {
    return { error: t("actions.s1e5byuf") };
  }

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const existing = await db.subscription.findUnique({
    where: { subscriberId_creatorId: { subscriberId, creatorId } },
  });

  await db.subscription.upsert({
    where: { subscriberId_creatorId: { subscriberId, creatorId } },
    create: {
      subscriberId,
      creatorId,
      amount,
      status: "active",
      subscribedSince: new Date(),
      currentPeriodEnd: periodEnd,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
    },
    update: {
      amount,
      status: "active",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: stripeSubscriptionId ?? undefined,
    },
  });

  const { platformFee, sellerAmount } = splitPlatformFee(amount);
  return {
    success: true as const,
    creatorId,
    username: creator.username,
    platformFee,
    sellerAmount,
    referenceId: creatorId,
    paymentIntentId,
    renewed: !!existing,
  };
}
