"use server";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import { runStripeDiagnostics, type StripeDiagnostics } from "@/lib/stripe-diagnostics";
import { isPaymentsConfigured, PREMIUM_USD_CENTS } from "@/lib/payments";
import { MIN_TIP_USD_CENTS } from "@/lib/money";
import { tipMetadataForCheckout } from "@/lib/donation-metadata";
import { getAppOrigin } from "@/lib/stripe";

export type StripeVerifyCreatorOption = {
  id: string;
  username: string;
};

export type StripeVerifyDashboard = {
  diagnostics: StripeDiagnostics;
  appOrigin: string;
  creators: StripeVerifyCreatorOption[];
  stripeTestCardHint: string;
  webhookLocalHint: string;
};

const STRIPE_TEST_CARD =
  "actions.4242_4242_4242_4242_cvc";

export async function getStripeVerifyDashboard(): Promise<StripeVerifyDashboard> {
  await requireAdmin({ action: "ADMIN_SECURITY_CHANGE", targetType: "stripe_verify", metadata: { view: true } });

  const diagnostics = await runStripeDiagnostics();
  const creators = await db.user.findMany({
    where: { username: { not: "" } },
    select: { id: true, username: true },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  const origin = getAppOrigin();
  const webhookLocalHint = t("actions.stripe_listen_forward_to_api", { v0: origin });

  return {
    diagnostics,
    appOrigin: origin,
    creators: creators.map((c) => ({ id: c.id, username: c.username })),
    stripeTestCardHint: STRIPE_TEST_CARD,
    webhookLocalHint,
  };
}

/** 플랫폼 Stripe 잔고로 들어가는 프리미엄 테스트 결제 */
export async function startStripePremiumSmokeCheckout(purchaseTermsAccepted?: boolean) {
  const admin = await requireAdmin({
    action: "ADMIN_SECURITY_CHANGE",
    targetType: "stripe_verify",
    metadata: { checkout: "PREMIUM" },
  });

  if (!isPaymentsConfigured()) {
    return { error: "actions.stripe" };
  }

  return createStripeCheckoutForUser({
    userId: admin.id,
    email: admin.email,
    type: "PREMIUM",
    amount: PREMIUM_USD_CENTS,
    orderName: "actions.mocomo_premium_stripe",
    metadata: { stripeVerify: true, scenario: "premium" },
    platform: "web",
    purchaseTermsAccepted: purchaseTermsAccepted === true,
  });
}

/** 크리에이터 후원(TIP) Stripe Checkout 테스트 */
export async function startStripeTipSmokeCheckout(input: {
  receiverUsername: string;
  amountUsdCents?: number;
  message?: string;
  purchaseTermsAccepted?: boolean;
}) {
  const admin = await requireAdmin({
    action: "ADMIN_SECURITY_CHANGE",
    targetType: "stripe_verify",
    metadata: { checkout: "TIP", receiver: input.receiverUsername },
  });

  if (!isPaymentsConfigured()) {
    return { error: "actions.stripe" };
  }

  const receiver = await db.user.findFirst({
    where: { username: input.receiverUsername.trim() },
    select: { id: true, username: true },
  });
  if (!receiver) return { error: "actions.sw72p7x" };
  if (receiver.id === admin.id) {
    return { error: "actions.sjpjjks" };
  }

  const amount = Math.max(MIN_TIP_USD_CENTS, Math.floor(input.amountUsdCents ?? MIN_TIP_USD_CENTS));

  return createStripeCheckoutForUser({
    userId: admin.id,
    email: admin.email,
    type: "TIP",
    amount,
    orderName: t("actions.stzgvn8", { v0: receiver.username }),
    metadata: {
      ...tipMetadataForCheckout({
        receiverId: receiver.id,
        username: receiver.username,
        message: input.message?.trim() || "actions.stripe_2",
        returnPath: "/admin/finance/stripe-verify",
      }),
      stripeVerify: true,
      scenario: "tip",
    },
    platform: "web",
    purchaseTermsAccepted: input.purchaseTermsAccepted === true,
  });
}
