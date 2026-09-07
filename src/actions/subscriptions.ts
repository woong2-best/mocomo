"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createCreatorSubscriptionCheckoutForUser,
  confirmCreatorSubscriptionCheckout,
} from "@/lib/creator-subscription-checkout";
import { cancelCreatorStripeSubscription } from "@/lib/creator-subscription-stripe";
import { isSubscriptionActive } from "@/lib/creator-subscription";

export async function startCreatorSubscriptionCheckout(input: {
  creatorId: string;
  username: string;
  amount: number;
  returnPath?: string;
  purchaseTermsAccepted?: boolean;
  recurringDonationTermsAccepted?: boolean;
}) {
  const user = await requireAuth();
  return createCreatorSubscriptionCheckoutForUser({
    userId: user.id,
    email: user.email,
    amount: input.amount,
    orderName: `@${input.username} 월 정기 후원`,
    metadata: {
      creatorId: input.creatorId,
      username: input.username,
      returnPath: input.returnPath,
    },
    platform: "web",
    purchaseTermsAccepted: input.purchaseTermsAccepted,
    recurringDonationTermsAccepted: input.recurringDonationTermsAccepted,
  });
}

export async function confirmCreatorSubscription(sessionId: string) {
  const user = await requireAuth();
  const result = await confirmCreatorSubscriptionCheckout(user.id, sessionId);
  if ("success" in result && result.success) {
    revalidatePath("/settings/subscriptions");
    revalidatePath("/wallet");
  }
  return result;
}

export async function getMyCreatorSubscriptions() {
  const user = await requireAuth();
  const rows = await db.subscription.findMany({
    where: { subscriberId: user.id },
    orderBy: { subscribedSince: "desc" },
    include: {
      creator: { select: { id: true, username: true, name: true, image: true } },
    },
  });

  return rows.map((s) => ({
    id: s.id,
    creatorId: s.creatorId,
    creatorUsername: s.creator.username,
    creatorName: s.creator.name,
    creatorImage: s.creator.image,
    amount: s.amount,
    status: s.status,
    active: isSubscriptionActive(s),
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
    subscribedSince: s.subscribedSince.toISOString(),
  }));
}

export async function cancelMyCreatorSubscription(creatorId: string) {
  const user = await requireAuth();
  const result = await cancelCreatorStripeSubscription(user.id, creatorId);
  if ("success" in result && result.success) {
    revalidatePath("/settings/subscriptions");
    revalidatePath(`/u/${creatorId}`);
  }
  return result;
}
