import { db } from "@/lib/db";
import { splitPlatformFee } from "@/lib/settlement";

export async function fulfillCreatorSubscriptionPurchase(
  subscriberId: string,
  creatorId: string,
  amount: number,
  paymentIntentId: string
) {
  const creator = await db.user.findUnique({
    where: { id: creatorId },
    select: { id: true, username: true, creatorSubscriptionPriceKrw: true },
  });
  if (!creator) return { error: "크리에이터를 찾을 수 없습니다." };
  if (creator.id === subscriberId) return { error: "본인은 구독할 수 없습니다." };
  if (creator.creatorSubscriptionPriceKrw !== amount) {
    return { error: "구독 가격이 일치하지 않습니다." };
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
    },
    update: {
      amount,
      status: "active",
      currentPeriodEnd: periodEnd,
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
