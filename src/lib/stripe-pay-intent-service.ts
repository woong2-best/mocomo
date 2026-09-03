import type { PaymentIntentType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { checkoutRedirectPath } from "@/lib/checkout-redirect";
import { checkoutCurrencyForType, isPaymentsConfigured } from "@/lib/payments";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";
import { isMarketplacePaymentAuthorized } from "@/lib/marketplace/stripe-payment";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { stripePaymentIntentReturnUrl } from "@/lib/stripe-payment-return-url";
import { validatePaymentInput } from "@/lib/stripe-checkout-validate";
import {
  getOrCreateStripeCustomer,
  listSavedPaymentMethods,
  type SavedPaymentMethod,
} from "@/lib/stripe-payment-methods";
import { getMocoCheckoutQuote } from "@/lib/moco-checkout-service";
import { assertOfacPaymentRequestAllowed, assertOfacPaymentAllowedForUser } from "@/lib/compliance/ofac-payment-guard-server";
import { assertMonetizationPaymentAllowed } from "@/lib/payment-rail";
import {
  assertAndRecordPurchaseTermsConsent,
  assertPurchaseTermsConsentRecorded,
} from "@/lib/purchase-terms-consent";
import type { PurchaseTermsPlatform } from "@/lib/purchase-chargeback-terms";
import {
  assertAdultVerifiedForPaidDm,
  paymentTypeRequiresAdultVerification,
} from "@/lib/adult-verification/paid-dm-guard";

function stripeMetadata(
  orderId: string,
  type: PaymentIntentType,
  userId: string,
  extra: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = { orderId, type, userId };
  for (const [key, value] of Object.entries(extra)) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    }
  }
  return out;
}

async function finalizePaidCheckout(userId: string, orderId: string) {
  const intent = await db.paymentIntent.findUnique({ where: { id: orderId } });
  if (!intent || intent.userId !== userId) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }

  if (intent.status === "PAID") {
    return {
      success: true as const,
      type: intent.type,
      alreadyPaid: true,
      redirectPath: checkoutRedirectPath(intent, intent.type),
    };
  }

  if (!intent.paymentKey) {
    return { error: "Stripe 결제 정보가 없습니다." };
  }

  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(intent.paymentKey);
  const marketplaceAuthorized =
    intent.type === "MARKETPLACE" && isMarketplacePaymentAuthorized(pi);
  const bidHoldAuthorized =
    intent.type === "USED_AUCTION_BID_HOLD" && isMarketplacePaymentAuthorized(pi);
  if (pi.status !== "succeeded" && !marketplaceAuthorized && !bidHoldAuthorized) {
    return { error: "결제가 완료되지 않았습니다." };
  }
  if (pi.metadata?.orderId !== orderId) {
    return { error: "결제 주문이 일치하지 않습니다." };
  }
  if (pi.amount !== intent.amount) {
    return { error: "결제 금액이 일치하지 않습니다." };
  }

  if (intent.type === "USED_AUCTION_BID_HOLD") {
    await db.paymentIntent.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        purchaseTermsAcceptedAt: intent.purchaseTermsAcceptedAt ?? new Date(),
      },
    });
    return {
      success: true as const,
      type: intent.type,
      redirectPath: checkoutRedirectPath(intent, intent.type),
    };
  }

  const consentBlock = await assertPurchaseTermsConsentRecorded(userId, orderId);
  if (consentBlock.error) return { error: consentBlock.error };

  const result = await fulfillPaymentIntent(orderId, pi.id, pi.amount);
  if (!result.ok) return { error: result.error };

  return {
    success: true as const,
    type: result.type,
    alreadyPaid: result.alreadyPaid,
    redirectPath: checkoutRedirectPath(intent, result.type),
  };
}

export async function prepareCheckoutPaymentIntent(input: {
  userId: string;
  email?: string | null;
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
}) {
  if (!isStripeConfigured()) {
    return { error: "결제가 설정되지 않았습니다." };
  }

  const ofacBlock = await assertOfacPaymentRequestAllowed(input.userId, input.metadata);
  if (ofacBlock) return ofacBlock;

  const adultBlock = assertMonetizationPaymentAllowed({ metadata: input.metadata });
  if ("error" in adultBlock && adultBlock.error) return adultBlock;

  if (paymentTypeRequiresAdultVerification(input.type)) {
    const dmAdultBlock = await assertAdultVerifiedForPaidDm(input.userId);
    if (dmAdultBlock) return dmAdultBlock;
  }

  const validation = await validatePaymentInput(input.userId, input);
  if (validation) return validation;

  const intent = await db.paymentIntent.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      paymentRail: "STRIPE",
      metadata: { ...input.metadata, orderName: input.orderName } as Prisma.InputJsonValue,
    },
  });

  const customerId = await getOrCreateStripeCustomer(input.userId, input.email);
  const stripe = getStripe();
  const currency = checkoutCurrencyForType(input.type);

  let pi: Stripe.PaymentIntent;
  try {
    // Saved-card sheet confirms on-session; setup_future_usage conflicts with off_session confirm.
    pi = await stripe.paymentIntents.create({
      amount: input.amount,
      currency,
      customer: customerId,
      description: input.orderName,
      metadata: stripeMetadata(intent.id, input.type, input.userId, input.metadata),
      automatic_payment_methods: { enabled: true },
    });
  } catch (e) {
    console.error("[prepareCheckoutPaymentIntent] stripe.paymentIntents.create", e);
    if (e instanceof Stripe.errors.StripeError) {
      return { error: e.message || "결제 준비에 실패했습니다." };
    }
    throw e;
  }

  await db.paymentIntent.update({
    where: { id: intent.id },
    data: { paymentKey: pi.id },
  });

  let methods: SavedPaymentMethod[] = [];
  try {
    methods = await listSavedPaymentMethods(input.userId);
  } catch (e) {
    console.error("[prepareCheckoutPaymentIntent] listSavedPaymentMethods", e);
  }

  const mocoQuote = await getMocoCheckoutQuote(input.userId, input.amount);

  return {
    orderId: intent.id,
    clientSecret: pi.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    methods,
    mocoBalance: mocoQuote.mocoBalance,
    mocoRequired: mocoQuote.mocoRequired,
    canPayWithMoco: mocoQuote.canPayWithMoco && input.type !== "MOCO_TOPUP",
  };
}

export async function payCheckoutWithSavedMethod(
  userId: string,
  orderId: string,
  paymentMethodId: string,
  opts?: { purchaseTermsAccepted?: boolean; platform?: PurchaseTermsPlatform }
) {
  if (!isPaymentsConfigured()) {
    return { error: "결제가 설정되지 않았습니다." };
  }

  const consentBlock = await assertAndRecordPurchaseTermsConsent({
    userId,
    paymentIntentId: orderId,
    termsAccepted: opts?.purchaseTermsAccepted === true,
    platform: opts?.platform,
  });
  if (consentBlock.error) return { error: consentBlock.error };

  const ofacBlock = await assertOfacPaymentAllowedForUser(userId);
  if (ofacBlock) return ofacBlock;

  const intent = await db.paymentIntent.findUnique({ where: { id: orderId } });
  if (!intent || intent.userId !== userId) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }
  if (intent.status === "PAID") {
    return finalizePaidCheckout(userId, orderId);
  }
  if (!intent.paymentKey) {
    return { error: "결제를 먼저 준비해 주세요." };
  }

  const methods = await listSavedPaymentMethods(userId);
  if (!methods.some((m) => m.id === paymentMethodId)) {
    return { error: "등록된 카드만 사용할 수 있습니다." };
  }

  const stripe = getStripe();
  try {
    const pi = await stripe.paymentIntents.confirm(intent.paymentKey, {
      payment_method: paymentMethodId,
      return_url: stripePaymentIntentReturnUrl(orderId),
    });

    if (pi.status === "requires_action" && pi.client_secret) {
      return {
        requiresAction: true as const,
        clientSecret: pi.client_secret,
        orderId,
      };
    }

    if (pi.status === "succeeded" || isMarketplacePaymentAuthorized(pi)) {
      return finalizePaidCheckout(userId, orderId);
    }

    return { error: "결제를 완료하지 못했습니다." };
  } catch (err: unknown) {
    const stripeErr = err as { code?: string; message?: string; payment_intent?: Stripe.PaymentIntent };
    if (
      stripeErr.code === "authentication_required" &&
      stripeErr.payment_intent?.client_secret
    ) {
      return {
        requiresAction: true as const,
        clientSecret: stripeErr.payment_intent.client_secret,
        orderId,
      };
    }
    return { error: stripeErr.message ?? "결제에 실패했습니다." };
  }
}

export async function confirmCheckoutPaymentIntent(userId: string, orderId: string) {
  return finalizePaidCheckout(userId, orderId);
}

export type PrepareCheckoutResult = Awaited<ReturnType<typeof prepareCheckoutPaymentIntent>>;
export type SavedMethodsList = SavedPaymentMethod[];
