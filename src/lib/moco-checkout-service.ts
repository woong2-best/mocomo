import type { PaymentIntentType } from "@prisma/client";
import { db } from "@/lib/db";
import { checkoutRedirectPath } from "@/lib/checkout-redirect";
import { krwToMoco } from "@/lib/moco/economy";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";
import { debitPlatformWallet, creditPlatformWallet, getOrCreatePlatformWallet } from "@/lib/platform/wallet/service";
import { assertOfacPaymentAllowedForUser } from "@/lib/compliance/ofac-payment-guard-server";
import {
  assertAndRecordPurchaseTermsConsent,
} from "@/lib/purchase-terms-consent";
import type { PurchaseTermsPlatform } from "@/lib/purchase-chargeback-terms";

const MOCO_PAY_BLOCKED: PaymentIntentType[] = ["MOCO_TOPUP"];

export async function getMocoCheckoutQuote(userId: string, amountKrw: number) {
  const wallet = await getOrCreatePlatformWallet(userId);
  const mocoRequired = krwToMoco(amountKrw);
  return {
    mocoBalance: wallet.mocoPoints,
    mocoRequired,
    canPayWithMoco: mocoRequired > 0 && wallet.mocoPoints >= mocoRequired,
  };
}

export async function payCheckoutWithMoco(
  userId: string,
  orderId: string,
  opts?: { purchaseTermsAccepted?: boolean; platform?: PurchaseTermsPlatform }
) {
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
  if (MOCO_PAY_BLOCKED.includes(intent.type)) {
    return { error: "모코 충전은 카드 결제만 가능합니다." };
  }
  if (intent.status === "PAID") {
    return {
      success: true as const,
      type: intent.type,
      alreadyPaid: true,
      redirectPath: checkoutRedirectPath(intent, intent.type),
    };
  }

  const mocoRequired = krwToMoco(intent.amount);
  if (mocoRequired <= 0) {
    return { error: "모코로 결제할 수 없는 금액입니다." };
  }

  // Re-check status inside a short critical path to reduce double-spend races
  const fresh = await db.paymentIntent.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true, type: true, amount: true },
  });
  if (!fresh || fresh.userId !== userId) return { error: "결제 정보를 찾을 수 없습니다." };
  if (fresh.status === "PAID") {
    return {
      success: true as const,
      type: fresh.type,
      alreadyPaid: true,
      redirectPath: checkoutRedirectPath(intent, fresh.type),
    };
  }

  const debit = await debitPlatformWallet({
    userId,
    bucket: "MOCO_POINTS",
    amount: mocoRequired,
    reason: `CHECKOUT_${intent.type}`,
    referenceType: "payment_intent",
    referenceId: intent.id,
    metadata: { krw: intent.amount, moco: mocoRequired },
  });
  if (!debit.ok) return { error: debit.error };

  const paymentRef = `moco:${intent.id}`;
  const result = await fulfillPaymentIntent(orderId, paymentRef, intent.amount);
  if (!result.ok) {
    await creditPlatformWallet({
      userId,
      bucket: "MOCO_POINTS",
      amount: mocoRequired,
      reason: "CHECKOUT_REFUND",
      referenceType: "payment_intent_refund",
      referenceId: intent.id,
    }).catch(() => null);
    return { error: result.error };
  }

  return {
    success: true as const,
    type: result.type,
    alreadyPaid: result.alreadyPaid,
    redirectPath: checkoutRedirectPath(intent, result.type),
    paidWithMoco: true as const,
    mocoSpent: mocoRequired,
  };
}
