"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import {
  GEM_TOPUP_PACKAGES,
  GEM_PURCHASE_TERMS_COPY,
  findGemTopupPackage,
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
  const balance = await getUserGemBalance(user.id);
  return { balance, packages: GEM_TOPUP_PACKAGES, termsCopy: GEM_PURCHASE_TERMS_COPY };
}

export async function createGemTopupCheckout(gems: number, purchaseTermsAccepted?: boolean) {
  const user = await requireAuth();
  const pack = findGemTopupPackage(gems);
  if (!pack) return { error: "유효하지 않은 젬 패키지입니다." };

  return createStripeCheckoutForUser({
    userId: user.id,
    email: user.email,
    type: "GEM_TOPUP",
    amount: pack.usdCents,
    orderName: pack.label,
    metadata: { gemAmount: pack.gems },
    purchaseTermsAccepted,
    platform: "web",
  });
}

export async function requestGemRefund(gemPurchaseId: string) {
  const user = await requireAuth();
  const result = await processRefundRequest(gemPurchaseId, user.id);
  if ("error" in result && result.error) {
    const code = result.error;
    const messages: Record<string, string> = {
      UNAUTHORIZED: "환불 권한이 없습니다.",
      ALREADY_REFUNDED: "이미 환불된 구매입니다.",
      NO_REMAINING_GEMS_TO_REFUND: "환불 가능한 미사용 젬이 없습니다.",
      REFUND_WINDOW_EXPIRED: "환불 기한이 지났습니다.",
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

export async function tipWithGems(
  creatorId: string,
  gems: number,
  message?: string,
  channelId?: string
) {
  const user = await requireAuth();
  const result = await spendGemsOnProfileTip({
    fanId: user.id,
    creatorId,
    gems,
    message,
    channelId,
  });
  if ("error" in result) {
    if (result.error === "INSUFFICIENT_GEMS_BALANCE") {
      return { error: "젬 잔액이 부족합니다. 충전 후 다시 시도해 주세요." };
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
  const result = await spendGemsOnLiveTip({
    fanId: user.id,
    creatorId: input.creatorId,
    channelId: input.channelId,
    gems: input.gems,
    message: input.message,
  });
  if ("error" in result) {
    if (result.error === "INSUFFICIENT_GEMS_BALANCE") {
      return { error: "젬 잔액이 부족합니다." };
    }
    return { error: result.error };
  }
  return result;
}

export async function purchasePostMediaWithGems(mediaId: string, gems: number) {
  const user = await requireAuth();
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
}
