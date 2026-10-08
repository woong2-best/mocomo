import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getMocoBalanceSnapshot } from "@/lib/auction-deposit/service";
import {
  adBoostRefundReason,
  creditPurchasedMocoWithHistory,
} from "@/lib/moco/transaction-history";
import { isBoostableImageMedia } from "@/lib/sponsored-ad/boostable";
import {
  calcBoostRefund,
  campaignPaidMoco,
  isComplimentaryCampaign,
  SPONSORED_AD_STATUS_ACTIVE,
  SPONSORED_AD_STATUS_CANCELLED,
  SPONSORED_AD_TARGET_POST,
  type BoostRefundQuote,
} from "@/lib/sponsored-ad/constants";
import {
  getSponsoredAdStatus,
  purchaseSponsoredAd,
  type PurchaseSponsoredAdResult,
} from "@/lib/sponsored-ad/purchase";

export async function boostPostAd(input: {
  userId: string;
  postId: string;
  days: number;
}): Promise<PurchaseSponsoredAdResult> {
  return purchaseSponsoredAd({
    userId: input.userId,
    targetType: SPONSORED_AD_TARGET_POST,
    targetId: input.postId,
    days: input.days,
    startsAt: new Date(),
  });
}

export type CancelSponsoredAdResult =
  | {
      ok: true;
      campaignId: string;
      refundMoco: number;
      usedDays: number;
      unusedDays: number;
      totalDays: number;
    }
  | { ok: false; error: string };

export async function cancelPostBoost(input: {
  userId: string;
  postId: string;
}): Promise<CancelSponsoredAdResult> {
  const now = new Date();
  const campaign = await db.sponsoredAdCampaign.findFirst({
    where: {
      userId: input.userId,
      targetType: SPONSORED_AD_TARGET_POST,
      targetId: input.postId,
      status: SPONSORED_AD_STATUS_ACTIVE,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!campaign) {
    return { ok: false, error: "No active promotion found." };
  }
  if (campaign.expiresAt <= now && !isComplimentaryCampaign(campaign)) {
    return { ok: false, error: "This promotion has already ended." };
  }

  const paidMoco = campaignPaidMoco(campaign);
  const quote = isComplimentaryCampaign(campaign)
    ? {
        elapsedHours: 0,
        usedDays: campaign.days,
        unusedDays: 0,
        refundMoco: 0,
        totalDays: campaign.days,
      }
    : calcBoostRefund({
        startsAt: campaign.startsAt,
        days: campaign.days,
        now,
        paidMoco,
      });

  try {
    await db.$transaction(async (tx) => {
      if (quote.refundMoco > 0) {
        await creditPurchasedMocoWithHistory(tx, {
          userId: input.userId,
          amountMoco: quote.refundMoco,
          type: "AD_REFUND",
          reason: adBoostRefundReason(quote.refundMoco),
          referenceId: campaign.id,
          metadata: {
            targetType: SPONSORED_AD_TARGET_POST,
            targetId: input.postId,
            days: campaign.days,
            usedDays: quote.usedDays,
            unusedDays: quote.unusedDays,
          },
        });
      }

      await tx.sponsoredAdCampaign.update({
        where: { id: campaign.id },
        data: {
          status: SPONSORED_AD_STATUS_CANCELLED,
          expiresAt: now,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_MOCO_AMOUNT") {
      return { ok: false, error: "Could not refund this promotion." };
    }
    throw e;
  }

  revalidatePath("/");
  revalidatePath(`/post/${input.postId}`);

  return {
    ok: true,
    campaignId: campaign.id,
    refundMoco: quote.refundMoco,
    usedDays: quote.usedDays,
    unusedDays: quote.unusedDays,
    totalDays: quote.totalDays,
  };
}

export type PostBoostStatus = {
  boostable: boolean;
  owned: boolean;
  purchasedMoco: number;
  active: boolean;
  campaign: {
    id: string;
    days: number;
    mocoPaid: number;
    startsAt: Date;
    expiresAt: Date;
    status: string;
    createdAt: Date;
  } | null;
  refund: BoostRefundQuote | null;
};

export async function getPostBoostStatus(
  userId: string,
  postId: string
): Promise<PostBoostStatus> {
  const [post, status, balance] = await Promise.all([
    db.post.findUnique({
      where: { id: postId },
      select: {
        authorId: true,
        visibility: true,
        media: { select: { type: true, url: true }, orderBy: { order: "asc" } },
      },
    }),
    getSponsoredAdStatus(SPONSORED_AD_TARGET_POST, postId),
    getMocoBalanceSnapshot(userId),
  ]);

  const owned = post?.authorId === userId;
  const boostable =
    !!post && owned && post.visibility === "PUBLIC" && isBoostableImageMedia(post.media);
  const refund =
    status.active && status.campaign
      ? calcBoostRefund({
          startsAt: status.campaign.startsAt,
          days: status.campaign.days,
          paidMoco: status.campaign.mocoPaid,
        })
      : null;

  return {
    boostable,
    owned,
    purchasedMoco: balance.availableMocoBalance,
    active: status.active,
    campaign: status.campaign,
    refund,
  };
}
