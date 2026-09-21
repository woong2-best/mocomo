"use server";

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
  "4242 4242 4242 4242 · 만료/ CVC 임의 · 우편번호 임의 (Stripe 테스트 모드)";

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
  const webhookLocalHint = `로컬 웹훅: stripe listen --forward-to ${origin}/api/webhooks/stripe`;

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
    return { error: "Stripe 키가 설정되지 않았습니다." };
  }

  return createStripeCheckoutForUser({
    userId: admin.id,
    email: admin.email,
    type: "PREMIUM",
    amount: PREMIUM_USD_CENTS,
    orderName: "[테스트] MoCoMo Premium (Stripe 검증)",
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
    return { error: "Stripe 키가 설정되지 않았습니다." };
  }

  const receiver = await db.user.findFirst({
    where: { username: input.receiverUsername.trim() },
    select: { id: true, username: true },
  });
  if (!receiver) return { error: "후원 대상 사용자를 찾을 수 없습니다." };
  if (receiver.id === admin.id) {
    return { error: "후원 테스트는 본인이 아닌 다른 계정을 선택하세요." };
  }

  const amount = Math.max(MIN_TIP_USD_CENTS, Math.floor(input.amountUsdCents ?? MIN_TIP_USD_CENTS));

  return createStripeCheckoutForUser({
    userId: admin.id,
    email: admin.email,
    type: "TIP",
    amount,
    orderName: `[테스트] @${receiver.username} 후원`,
    metadata: {
      ...tipMetadataForCheckout({
        receiverId: receiver.id,
        username: receiver.username,
        message: input.message?.trim() || "Stripe 후원 테스트",
        returnPath: "/admin/finance/stripe-verify",
      }),
      stripeVerify: true,
      scenario: "tip",
    },
    platform: "web",
    purchaseTermsAccepted: input.purchaseTermsAccepted === true,
  });
}
