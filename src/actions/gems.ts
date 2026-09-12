"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import {
  payCheckoutWithSavedMethod,
  prepareCheckoutPaymentIntent,
} from "@/lib/stripe-pay-intent-service";
import {
  GEM_PURCHASE_TERMS_COPY,
  MIN_MOCO_TOPUP_COUNT,
  quoteGemTopup,
} from "@/lib/gems/constants";
import { getUserGemBalance } from "@/lib/gems/balance";
import {
  processRefundRequest,
  submitUnauthorizedPaymentClaim,
} from "@/lib/gems/refund";
import {
  spendGemsOnProfileTip,
  spendGemsOnLiveTip,
  spendGemsOnPostMedia,
} from "@/lib/gems/spend-bridge";
import { db } from "@/lib/db";

export async function getMyGemBalance() {
  const user = await requireAuth();
  try {
    const balance = await getUserGemBalance(user.id);
    return {
      balance,
      minTopupMoco: MIN_MOCO_TOPUP_COUNT,
      termsCopy: GEM_PURCHASE_TERMS_COPY,
    };
  } catch (e) {
    console.error("[getMyGemBalance]", e);
    return {
      balance: 0,
      minTopupMoco: MIN_MOCO_TOPUP_COUNT,
      termsCopy: GEM_PURCHASE_TERMS_COPY,
    };
  }
}

export async function createGemTopupCheckout(moco: number, purchaseTermsAccepted?: boolean) {
  const user = await requireAuth();
  const { checkRateLimit, authLimiter } = await import("@/lib/ratelimit");
  const limited = await checkRateLimit(authLimiter, `gem-topup:${user.id}`);
  if (!limited.success) {
    return { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!purchaseTermsAccepted) {
    return { error: "충전 전 약관에 동의해 주세요." };
  }

  const quote = quoteGemTopup(moco);
  if (!quote.ok) return { error: quote.error };

  return createStripeCheckoutForUser({
    userId: user.id,
    email: user.email,
    type: "GEM_TOPUP",
    amount: quote.usdCents,
    orderName: quote.orderName,
    metadata: { gemAmount: quote.moco },
    purchaseTermsAccepted: true,
    platform: "web",
  });
}

/** 지갑 등록 카드로 MOCO 충전 (Stripe Checkout 리다이렉트 없음) */
export async function payGemTopupWithSavedCard(
  moco: number,
  paymentMethodId: string | undefined,
  purchaseTermsAccepted?: boolean
) {
  const user = await requireAuth();
  const { checkRateLimit, authLimiter } = await import("@/lib/ratelimit");
  const limited = await checkRateLimit(authLimiter, `gem-topup:${user.id}`);
  if (!limited.success) {
    return { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!purchaseTermsAccepted) {
    return { error: "충전 전 약관에 동의해 주세요." };
  }

  const quote = quoteGemTopup(moco);
  if (!quote.ok) return { error: quote.error };

  const prepared = await prepareCheckoutPaymentIntent({
    userId: user.id,
    email: user.email,
    type: "GEM_TOPUP",
    amount: quote.usdCents,
    orderName: quote.orderName,
    metadata: { gemAmount: quote.moco },
  });
  if ("error" in prepared && prepared.error) {
    return { error: prepared.error };
  }
  if (!("orderId" in prepared) || !prepared.orderId) {
    return { error: "결제 준비에 실패했습니다." };
  }

  const pmId =
    paymentMethodId ??
    prepared.methods.find((m) => m.isDefault)?.id ??
    prepared.methods[0]?.id;
  if (!pmId) {
    return { error: "등록된 카드가 없습니다. 아래에서 카드를 추가해 주세요." };
  }

  const result = await payCheckoutWithSavedMethod(user.id, prepared.orderId, pmId, {
    purchaseTermsAccepted: true,
    platform: "web",
  });

  if ("success" in result && result.success) {
    revalidatePath("/wallet");
  }

  return {
    ...result,
    publishableKey: prepared.publishableKey,
  };
}

export async function requestGemRefund(gemPurchaseId: string) {
  const user = await requireAuth();
  const result = await processRefundRequest(gemPurchaseId, user.id);
  if ("error" in result && result.error) {
    const code = result.error;
    const messages: Record<string, string> = {
      UNAUTHORIZED: "환불 권한이 없습니다.",
      REFUND_NOT_ALLOWED: "구매 MOCO는 환불할 수 없습니다.",
    };
    return { error: messages[code] ?? code };
  }
  revalidatePath("/wallet");
  return result;
}

export async function submitGemUnauthorizedClaim(input: {
  gemPurchaseId: string;
  reason: "stolen_card" | "minor_without_consent";
  proofUrl?: string;
}) {
  const user = await requireAuth();
  const result = await submitUnauthorizedPaymentClaim({
    gemPurchaseId: input.gemPurchaseId,
    fanId: user.id,
    reason: input.reason,
    proofUrl: input.proofUrl,
  });
  if ("error" in result) return { error: "청구를 접수할 수 없습니다." };
  return { success: true as const, claimId: result.claim.id };
}

async function gemSpendRateLimit(userId: string) {
  const { checkRateLimit, authLimiter } = await import("@/lib/ratelimit");
  const limited = await checkRateLimit(authLimiter, `gem-spend:${userId}`);
  if (!limited.success) {
    return { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
  }
  return null;
}

export async function tipWithGems(
  creatorId: string,
  gems: number,
  message?: string,
  channelId?: string
) {
  const user = await requireAuth();
  const limited = await gemSpendRateLimit(user.id);
  if (limited) return limited;
  const { validatePaymentInput } = await import("@/lib/stripe-checkout-validate");
  const validation = await validatePaymentInput(user.id, {
    type: "TIP",
    amount: gems,
    metadata: { receiverId: creatorId, message, channelId },
  });
  if (validation) return validation;
  const result = await spendGemsOnProfileTip({
    fanId: user.id,
    creatorId,
    gems,
    message,
    channelId,
  });
  if ("error" in result) {
    if (result.error === "INSUFFICIENT_MOCO_BALANCE") {
      return { error: "MOCO 잔액이 부족합니다. 충전 후 다시 시도해 주세요." };
    }
    return { error: result.error };
  }
  revalidatePath("/wallet");
  revalidatePath("/support");
  return result;
}

export async function liveTipWithGems(input: {
  creatorId: string;
  channelId: string;
  gems: number;
  message?: string;
}) {
  const user = await requireAuth();
  const limited = await gemSpendRateLimit(user.id);
  if (limited) return limited;
  const { validatePaymentInput } = await import("@/lib/stripe-checkout-validate");
  const validation = await validatePaymentInput(user.id, {
    type: "TIP",
    amount: input.gems,
    metadata: {
      receiverId: input.creatorId,
      channelId: input.channelId,
      message: input.message,
    },
  });
  if (validation) return validation;
  const result = await spendGemsOnLiveTip({
    fanId: user.id,
    creatorId: input.creatorId,
    channelId: input.channelId,
    gems: input.gems,
    message: input.message,
  });
  if ("error" in result) {
    if (result.error === "INSUFFICIENT_MOCO_BALANCE") {
      return { error: "MOCO 잔액이 부족합니다." };
    }
    return { error: result.error };
  }
  return result;
}

export async function purchasePostMediaWithGems(mediaId: string, gems: number) {
  const user = await requireAuth();
  const limited = await gemSpendRateLimit(user.id);
  if (limited) return limited;
  const media = await db.postMedia.findUnique({
    where: { id: mediaId },
    include: { post: { select: { instantPurchasePriceKrw: true } } },
  });
  if (media) {
    const priceCents = media.priceKrw > 0 ? media.priceKrw : media.post.instantPurchasePriceKrw;
    const { usdCentsToMocoRequired } = await import("@/lib/gems/constants");
    if (gems !== usdCentsToMocoRequired(priceCents)) {
      return { error: "가격이 변경되었습니다. 다시 시도해 주세요." };
    }
  }
  const result = await spendGemsOnPostMedia({
    fanId: user.id,
    mediaId,
    gems,
  });
  if ("error" in result) return { error: result.error };
  if ("postId" in result && result.postId) {
    revalidatePath(`/post/${result.postId}`);
  }
  revalidatePath("/wallet");
  return result;
}

export async function getMyGemPurchases(take = 30) {
  const user = await requireAuth();
  try {
    const [purchases, balance] = await Promise.all([
      db.gemPurchase.findMany({
        where: { fanId: user.id },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          gems: true,
          remainingGems: true,
          krwAmount: true,
          refunded: true,
          refundedUsd: true,
          createdAt: true,
        },
      }),
      getUserGemBalance(user.id),
    ]);
    return { purchases, balance };
  } catch (e) {
    console.error("[getMyGemPurchases]", e);
    return { purchases: [], balance: 0 };
  }
}
