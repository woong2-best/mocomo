import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  buildPurchaseChargebackTermsSnapshot,
  PURCHASE_CHARGEBACK_TERMS_VERSION,
  type PurchaseTermsPlatform,
} from "@/lib/purchase-chargeback-terms";

export const PURCHASE_TERMS_REQUIRED_ERROR =
  "결제 전 이용약관(만 18세 이상·무단 결제 책임)에 동의해 주세요.";

export type RecordPurchaseTermsInput = {
  userId: string;
  paymentIntentId: string;
  termsAccepted: boolean;
  platform?: PurchaseTermsPlatform;
};

function consentFields(platform?: PurchaseTermsPlatform) {
  const acceptedAt = new Date();
  return {
    purchaseTermsVersion: PURCHASE_CHARGEBACK_TERMS_VERSION,
    purchaseTermsAcceptedAt: acceptedAt,
    purchaseTermsSnapshot: buildPurchaseChargebackTermsSnapshot(),
    purchaseTermsPlatform: platform ?? null,
  };
}

async function syncStripePurchaseTermsMetadata(paymentKey: string, acceptedAt: Date) {
  if (!isStripeConfigured()) return;
  try {
    const stripe = getStripe();
    await stripe.paymentIntents.update(paymentKey, {
      metadata: {
        purchaseTermsVersion: PURCHASE_CHARGEBACK_TERMS_VERSION,
        purchaseTermsAcceptedAt: acceptedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[purchase-terms-consent] stripe metadata update", e);
  }
}

async function mirrorMarketplaceOrderTerms(
  paymentIntentId: string,
  fields: ReturnType<typeof consentFields>
) {
  const intent = await db.paymentIntent.findUnique({
    where: { id: paymentIntentId },
    select: { type: true, metadata: true },
  });
  if (!intent || intent.type !== "MARKETPLACE") return;

  const meta = intent.metadata as Record<string, string | undefined>;
  const marketplaceOrderId = meta.marketplaceOrderId;
  if (!marketplaceOrderId) return;

  await db.marketplaceOrder.updateMany({
    where: { id: marketplaceOrderId },
    data: fields,
  });
}

/** Returns error if terms not accepted; no-op if already recorded for this payment. */
export async function assertAndRecordPurchaseTermsConsent(
  input: RecordPurchaseTermsInput
): Promise<{ error?: string }> {
  const intent = await db.paymentIntent.findUnique({
    where: { id: input.paymentIntentId },
    select: {
      id: true,
      userId: true,
      paymentKey: true,
      purchaseTermsAcceptedAt: true,
    },
  });

  if (!intent || intent.userId !== input.userId) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }

  if (intent.purchaseTermsAcceptedAt) {
    return {};
  }

  if (!input.termsAccepted) {
    return { error: PURCHASE_TERMS_REQUIRED_ERROR };
  }

  const fields = consentFields(input.platform);

  await db.paymentIntent.update({
    where: { id: input.paymentIntentId },
    data: fields,
  });

  await mirrorMarketplaceOrderTerms(input.paymentIntentId, fields);

  if (intent.paymentKey) {
    await syncStripePurchaseTermsMetadata(intent.paymentKey, fields.purchaseTermsAcceptedAt);
  }

  return {};
}

/** Required before fulfilling payment (e.g. after 3DS return). */
export async function assertPurchaseTermsConsentRecorded(
  userId: string,
  paymentIntentId: string
): Promise<{ error?: string }> {
  const intent = await db.paymentIntent.findUnique({
    where: { id: paymentIntentId },
    select: { userId: true, purchaseTermsAcceptedAt: true },
  });

  if (!intent || intent.userId !== userId) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }

  if (!intent.purchaseTermsAcceptedAt) {
    return { error: PURCHASE_TERMS_REQUIRED_ERROR };
  }

  return {};
}
