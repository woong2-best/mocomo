import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { confirmCreatorSubscriptionCheckout } from "@/lib/creator-subscription-checkout";
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
  void input;
  return { error: t("actions.si8p6b0") };
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
