import type { PaymentIntentType } from "@prisma/client";
import { db } from "@/lib/db";
import { checkoutRedirectPath } from "@/lib/checkout-redirect";
import { krwToMoco } from "@/lib/moco/economy";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";
import { getOrCreatePlatformWallet } from "@/lib/platform/wallet/service";
import { burnPurchasedMocoWithHistory } from "@/lib/moco/transaction-history";
import { getMocoBalanceSnapshot } from "@/lib/auction-deposit/service";
import { assertOfacPaymentAllowedForUser } from "@/lib/compliance/ofac-payment-guard-server";
import {
  assertAndRecordPurchaseTermsConsent,
} from "@/lib/purchase-terms-consent";
import type { PurchaseTermsPlatform } from "@/lib/purchase-chargeback-terms";

const MOCO_PAY_BLOCKED: PaymentIntentType[] = ["MOCO_TOPUP", "GEM_TOPUP"];

export async function getMocoCheckoutQuote(userId: string, amountKrw: number) {
  const snap = await getMocoBalanceSnapshot(userId);
  const mocoRequired = krwToMoco(amountKrw);
  return {
    mocoBalance: snap.availableMocoBalance,
    mocoRequired,
    canPayWithMoco: mocoRequired > 0 && snap.availableMocoBalance >= mocoRequired,
  };
}

export async function payCheckoutWithMoco(
  userId: string,
  orderId: string,
  opts?: { purchaseTermsAccepted?: boolean; platform?: PurchaseTermsPlatform }
) {
  if (opts?.platform === "mobile") {
    return { error: "MOCO instant checkout isn't available in the mobile app." };
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
    return { error: "Payment information not found." };
  }
  if (MOCO_PAY_BLOCKED.includes(intent.type)) {
    return { error: "MOCO top-ups require card payment." };
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
    return { error: "This amount can't be paid with MOCO." };
  }

  const fresh = await db.paymentIntent.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true, type: true, amount: true },
  });
  if (!fresh || fresh.userId !== userId) return { error: "Payment information not found." };
  if (fresh.status === "PAID") {
    return {
      success: true as const,
      type: fresh.type,
      alreadyPaid: true,
      redirectPath: checkoutRedirectPath(intent, fresh.type),
    };
  }

  const snap = await getMocoBalanceSnapshot(userId);
  if (snap.availableMocoBalance < mocoRequired) {
    return { error: "Insufficient MOCO balance." };
  }

  // Unified purchased MOCO burn (mocoPoints → gemBalance FIFO). Client-sent balances are never trusted.
  try {
    await db.$transaction(async (tx) => {
      await burnPurchasedMocoWithHistory(tx, {
        userId,
        amountMoco: mocoRequired,
        type: "CHECKOUT_BURN",
        reason: `CHECKOUT_${intent.type}`,
        referenceId: `checkout-moco:${intent.id}`,
        metadata: { krw: intent.amount, moco: mocoRequired, paymentIntentId: intent.id },
      });
    });
  } catch {
    return { error: "Insufficient MOCO balance." };
  }

  const paymentRef = `moco:${intent.id}`;
  const result = await fulfillPaymentIntent(orderId, paymentRef, intent.amount);
  if (!result.ok) {
    await getOrCreatePlatformWallet(userId);
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
