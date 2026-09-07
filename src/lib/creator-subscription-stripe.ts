import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getStripeSubscriptionPeriodEndUnix } from "@/lib/stripe-subscription-utils";
import { fulfillCreatorSubscriptionPurchase } from "@/actions/creator-subscription-purchase";
import {
  creditSellerEarning,
  recordPlatformFee,
  recordPaymentGross,
} from "@/lib/settlement";

export async function fulfillCreatorSubscriptionFromStripe(input: {
  orderId: string;
  subscriberId: string;
  stripeSubscriptionId: string;
  stripeSessionId: string;
  amountUsdCents: number;
}) {
  const intent = await db.paymentIntent.findUnique({ where: { id: input.orderId } });
  if (!intent || intent.userId !== input.subscriberId) {
    return { error: "결제 정보를 찾을 수 없습니다." as const };
  }
  if (intent.status === "PAID") {
    return { success: true as const, alreadyPaid: true };
  }

  const meta = intent.metadata as Record<string, string>;
  const creatorId = meta.creatorId;
  if (!creatorId) return { error: "크리에이터 정보가 없습니다." as const };

  await recordPaymentGross(input.amountUsdCents, intent.id, intent.type);

  const r = await fulfillCreatorSubscriptionPurchase(
    input.subscriberId,
    creatorId,
    input.amountUsdCents,
    input.orderId,
    input.stripeSubscriptionId
  );
  if ("error" in r && r.error) return { error: r.error };

  if ("success" in r && r.success) {
    await recordPlatformFee(r.platformFee, {
      referenceType: "creator_subscription",
      referenceId: r.referenceId,
      paymentIntentId: input.orderId,
      memo: "크리에이터 정기 후원",
    });
    await creditSellerEarning(r.creatorId, r.sellerAmount, {
      referenceType: "creator_subscription",
      referenceId: r.referenceId,
      paymentIntentId: input.orderId,
      memo: "크리에이터 정기 후원",
    });
  }

  await db.paymentIntent.update({
    where: { id: input.orderId },
    data: {
      status: "PAID",
      paymentKey: input.stripeSubscriptionId,
      paidAt: new Date(),
    },
  });

  return { success: true as const };
}

export async function renewCreatorSubscriptionFromInvoice(input: {
  stripeSubscriptionId: string;
  amountUsdCents: number;
  stripeInvoiceId: string;
}) {
  const sub = await db.subscription.findFirst({
    where: { stripeSubscriptionId: input.stripeSubscriptionId },
  });
  if (!sub) return { skipped: true as const };

  const stripe = getStripe();
  const stripeSub = await stripe.subscriptions.retrieve(input.stripeSubscriptionId);
  const periodEnd = new Date(getStripeSubscriptionPeriodEndUnix(stripeSub) * 1000);

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status: stripeSub.status === "active" ? "active" : sub.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    },
  });

  const { splitPlatformFee } = await import("@/lib/settlement");
  const { platformFee, sellerAmount } = splitPlatformFee(input.amountUsdCents);

  await recordPlatformFee(platformFee, {
    referenceType: "creator_subscription_renewal",
    referenceId: input.stripeInvoiceId,
    memo: `구독 갱신 ${sub.creatorId}`,
  });
  await creditSellerEarning(sub.creatorId, sellerAmount, {
    referenceType: "creator_subscription_renewal",
    referenceId: input.stripeInvoiceId,
    memo: "크리에이터 정기 후원 갱신",
  });

  return { success: true as const };
}

export async function syncCreatorSubscriptionFromStripe(stripeSubscriptionId: string) {
  const stripe = getStripe();
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const sub = await db.subscription.findFirst({
    where: { stripeSubscriptionId },
  });
  if (!sub) return;

  const periodEnd = new Date(getStripeSubscriptionPeriodEndUnix(stripeSub) * 1000);
  const canceled = stripeSub.status === "canceled" || stripeSub.status === "unpaid";

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status: canceled ? "canceled" : "active",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    },
  });
}

export async function cancelCreatorStripeSubscription(subscriberId: string, creatorId: string) {
  const sub = await db.subscription.findUnique({
    where: { subscriberId_creatorId: { subscriberId, creatorId } },
  });
  if (!sub) return { error: "구독을 찾을 수 없습니다." as const };
  if (!sub.stripeSubscriptionId) {
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: "canceled", cancelAtPeriodEnd: true },
    });
    return { success: true as const };
  }

  const stripe = getStripe();
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  });

  return { success: true as const, cancelAtPeriodEnd: true };
}
