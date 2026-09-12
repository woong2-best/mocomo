import type { PaymentIntentType } from "@prisma/client";
import { db } from "@/lib/db";
import { checkoutRedirectPath } from "@/lib/checkout-redirect";
import { validatePaymentInput } from "@/lib/stripe-checkout-validate";
import { assertOfacPaymentAllowedForUser } from "@/lib/compliance/ofac-payment-guard-server";
import {
  assertAndRecordPurchaseTermsConsent,
} from "@/lib/purchase-terms-consent";
import type { PurchaseTermsPlatform } from "@/lib/purchase-chargeback-terms";
import {
  spendGemsOnLiveTip,
  spendGemsOnPostMedia,
  spendGemsOnProfileTip,
} from "@/lib/gems/spend-bridge";

const GEM_ELIGIBLE: PaymentIntentType[] = ["TIP", "POST_MEDIA"];

function metaRecord(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

async function executeGemSpend(
  userId: string,
  type: PaymentIntentType,
  amount: number,
  metadata: Record<string, unknown>
) {
  const gems = amount;
  if (!Number.isInteger(gems) || gems <= 0) {
    return { error: "유효하지 않은 결제 금액입니다." as const };
  }

  if (type === "POST_MEDIA") {
    const mediaId = String(metadata.mediaId ?? "");
    if (!mediaId) return { error: "미디어 정보가 없습니다." as const };
    return spendGemsOnPostMedia({ fanId: userId, mediaId, gems });
  }

  const receiverId = String(metadata.receiverId ?? "");
  if (!receiverId) return { error: "후원 대상이 없습니다." as const };

  const message = typeof metadata.message === "string" ? metadata.message : undefined;
  const channelId =
    typeof metadata.channelId === "string" ? metadata.channelId.trim() : undefined;

  if (channelId) {
    return spendGemsOnLiveTip({
      fanId: userId,
      creatorId: receiverId,
      channelId,
      gems,
      message,
    });
  }

  return spendGemsOnProfileTip({
    fanId: userId,
    creatorId: receiverId,
    gems,
    message,
    channelId,
  });
}

/** MOCO(gem) 결제 — 금액·메타는 PaymentIntent DB만 신뢰 (클라이언트 amount 불가) */
export async function payCheckoutWithGemsFromOrder(
  userId: string,
  orderId: string,
  opts?: { purchaseTermsAccepted?: boolean; platform?: PurchaseTermsPlatform }
) {
  if (!orderId || typeof orderId !== "string" || orderId.length > 64) {
    return { error: "잘못된 결제 요청입니다." as const };
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
    return { error: "결제 정보를 찾을 수 없습니다." as const };
  }
  if (!GEM_ELIGIBLE.includes(intent.type)) {
    return { error: "MOCO로 결제할 수 없는 유형입니다." as const };
  }
  if (intent.status === "PAID") {
    return {
      success: true as const,
      type: intent.type,
      alreadyPaid: true,
      redirectPath: checkoutRedirectPath(intent, intent.type),
    };
  }

  const metadata = metaRecord(intent.metadata);
  const validation = await validatePaymentInput(userId, {
    type: intent.type,
    amount: intent.amount,
    metadata,
  });
  if (validation) return { error: validation.error };

  const fresh = await db.paymentIntent.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true, type: true, amount: true, metadata: true },
  });
  if (!fresh || fresh.userId !== userId) {
    return { error: "결제 정보를 찾을 수 없습니다." as const };
  }
  if (fresh.status === "PAID") {
    return {
      success: true as const,
      type: fresh.type,
      alreadyPaid: true,
      redirectPath: checkoutRedirectPath(intent, fresh.type),
    };
  }

  const result = await executeGemSpend(
    userId,
    fresh.type,
    fresh.amount,
    metaRecord(fresh.metadata)
  );
  if ("error" in result && result.error) return result;

  await db.paymentIntent.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paymentKey: `gem:${orderId}`,
    },
  });

  return {
    success: true as const,
    type: fresh.type,
    redirectPath: checkoutRedirectPath(intent, fresh.type),
    ...("balance" in result ? { balance: result.balance } : {}),
  };
}

/** @deprecated payCheckoutWithGemsFromOrder(orderId) 사용 — 클라이언트 amount 신뢰 금지 */
export async function payCheckoutWithGems(_input: {
  userId: string;
  type: PaymentIntentType;
  amountUsdCents: number;
  metadata: Record<string, unknown>;
}) {
  return { error: "orderId가 필요합니다. 결제 화면을 다시 열어 주세요." as const };
}
