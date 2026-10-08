/**
 * 스폰서드 광고 MOCO 결제 — purchasedMoco Burn + MocoTransactionHistory
 */

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getMocoBalanceSnapshot } from "@/lib/auction-deposit/service";
import { mocoCovers } from "@/lib/moco/decimal-amount";
import {
  adBoostPurchaseReason,
  adPurchaseReason,
  burnPurchasedMocoWithHistory,
} from "@/lib/moco/transaction-history";
import { isBoostableImageMedia } from "@/lib/sponsored-ad/boostable";
import {
  calcSponsoredAdExpiresAt,
  calcSponsoredAdMoco,
  campaignPaidMoco,
  isComplimentaryCampaign,
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS,
  SPONSORED_AD_STATUS_ACTIVE,
  SPONSORED_AD_TARGET_EVENT,
  SPONSORED_AD_TARGET_POST,
  splitSponsoredAdMoco,
  type SponsoredAdTargetType,
} from "@/lib/sponsored-ad/constants";

type Tx = Prisma.TransactionClient;

const INSUFFICIENT_MOCO = "Insufficient purchased MOCO balance.";

async function validateTarget(
  tx: Tx,
  userId: string,
  targetType: SponsoredAdTargetType,
  targetId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (targetType === SPONSORED_AD_TARGET_EVENT) {
    const event = await tx.event.findUnique({ where: { id: targetId } });
    if (!event || event.createdById !== userId) {
      return { ok: false, error: "Event not found." };
    }
    if (event.registrationFeePaid) {
      return { ok: false, error: "This event is already registered with an active ad." };
    }
    return { ok: true };
  }
  if (targetType === SPONSORED_AD_TARGET_POST) {
    const post = await tx.post.findUnique({
      where: { id: targetId },
      select: {
        authorId: true,
        visibility: true,
        media: { select: { type: true, url: true }, orderBy: { order: "asc" } },
      },
    });
    if (!post || post.authorId !== userId) {
      return { ok: false, error: "Post not found." };
    }
    if (post.visibility !== "PUBLIC") {
      return { ok: false, error: "Only public posts can be boosted." };
    }
    if (!isBoostableImageMedia(post.media)) {
      return { ok: false, error: "Only photo posts can be boosted." };
    }
    return { ok: true };
  }
  return { ok: false, error: "Unsupported ad target." };
}

async function activateTarget(
  tx: Tx,
  targetType: SponsoredAdTargetType,
  targetId: string
) {
  if (targetType === SPONSORED_AD_TARGET_EVENT) {
    await tx.event.update({
      where: { id: targetId },
      data: { registrationFeePaid: true, status: "PUBLISHED" },
    });
  }
}

export type PurchaseSponsoredAdInput = {
  userId: string;
  targetType: SponsoredAdTargetType;
  targetId: string;
  days: number;
  startsAt?: Date;
};

export type ActivateSponsoredAdComplimentaryInput = {
  userId: string;
  targetType: SponsoredAdTargetType;
  targetId: string;
  days: number;
  startsAt: Date;
  expiresAt: Date;
};

export type PurchaseSponsoredAdResult =
  | {
      ok: true;
      campaignId: string;
      mocoPaid: number;
      expiresAt: Date;
    }
  | { ok: false; error: string };

function purchaseReason(targetType: SponsoredAdTargetType, days: number): string {
  return targetType === SPONSORED_AD_TARGET_POST
    ? adBoostPurchaseReason(days)
    : adPurchaseReason(days);
}

export async function purchaseSponsoredAd(
  input: PurchaseSponsoredAdInput
): Promise<PurchaseSponsoredAdResult> {
  const { assertMoneyAgeAllowed } = await import("@/lib/money-age-gate");
  const ageBlock = await assertMoneyAgeAllowed(input.userId);
  if (ageBlock) return { ok: false, error: ageBlock.error };

  let mocoPaid: number;
  try {
    mocoPaid = calcSponsoredAdMoco(input.days);
  } catch {
    return { ok: false, error: `광고 기간은 1~${SPONSORED_AD_MAX_DAYS}일까지 선택할 수 있습니다.` };
  }

  const paidParts = splitSponsoredAdMoco(mocoPaid);

  const balance = await getMocoBalanceSnapshot(input.userId);
  if (!mocoCovers(balance.availableMocoBalance, mocoPaid)) {
    return { ok: false, error: INSUFFICIENT_MOCO };
  }

  const now = new Date();
  const activeCampaign = await db.sponsoredAdCampaign.findFirst({
    where: {
      targetType: input.targetType,
      targetId: input.targetId,
      status: SPONSORED_AD_STATUS_ACTIVE,
      expiresAt: { gt: now },
    },
    select: { id: true, mocoPaid: true, mocoPaidTenths: true },
  });
  if (activeCampaign) {
    return { ok: false, error: "An active sponsored ad already exists." };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const validated = await validateTarget(tx, input.userId, input.targetType, input.targetId);
      if (!validated.ok) return validated;

      const startsAt = input.startsAt ?? new Date();
      const expiresAt = calcSponsoredAdExpiresAt(input.days, startsAt);

      const campaign = await tx.sponsoredAdCampaign.create({
        data: {
          userId: input.userId,
          targetType: input.targetType,
          targetId: input.targetId,
          days: input.days,
          mocoPaid: paidParts.whole,
          mocoPaidTenths: paidParts.tenths,
          startsAt,
          expiresAt,
          status: SPONSORED_AD_STATUS_ACTIVE,
        },
      });

      await burnPurchasedMocoWithHistory(tx, {
        userId: input.userId,
        amountMoco: mocoPaid,
        type: "AD_PURCHASE",
        reason: purchaseReason(input.targetType, input.days),
        referenceId: campaign.id,
        metadata: {
          targetType: input.targetType,
          targetId: input.targetId,
          days: input.days,
        },
      });

      await activateTarget(tx, input.targetType, input.targetId);

      return {
        ok: true as const,
        campaignId: campaign.id,
        mocoPaid,
        expiresAt,
      };
    });

    if (!result.ok) return result;

    revalidatePath("/events");
    revalidatePath("/");
    if (input.targetType === SPONSORED_AD_TARGET_POST) {
      revalidatePath(`/post/${input.targetId}`);
    }
    return result;
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_MOCO") {
      return { ok: false, error: INSUFFICIENT_MOCO };
    }
    throw e;
  }
}

/** 사이트 운영자 — MOCO 차감 없이 광고 활성화 (기간 상한 = 운영자 무제한) */
export async function activateSponsoredAdComplimentary(
  input: ActivateSponsoredAdComplimentaryInput
): Promise<PurchaseSponsoredAdResult> {
  if (
    !Number.isInteger(input.days) ||
    input.days < 1 ||
    input.days > SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS
  ) {
    return {
      ok: false,
      error: `광고 기간은 1~${SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS}일까지 선택할 수 있습니다.`,
    };
  }

  const now = new Date();
  const activeCampaign = await db.sponsoredAdCampaign.findFirst({
    where: {
      targetType: input.targetType,
      targetId: input.targetId,
      status: SPONSORED_AD_STATUS_ACTIVE,
      OR: [{ expiresAt: { gt: now } }, { mocoPaid: 0, mocoPaidTenths: 0 }],
    },
    select: { id: true },
  });
  if (activeCampaign) {
    return { ok: false, error: "An active sponsored ad already exists." };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const validated = await validateTarget(tx, input.userId, input.targetType, input.targetId);
      if (!validated.ok) return validated;

      const campaign = await tx.sponsoredAdCampaign.create({
        data: {
          userId: input.userId,
          targetType: input.targetType,
          targetId: input.targetId,
          days: input.days,
          mocoPaid: 0,
          mocoPaidTenths: 0,
          startsAt: input.startsAt,
          expiresAt: input.expiresAt,
          status: SPONSORED_AD_STATUS_ACTIVE,
        },
      });

      await activateTarget(tx, input.targetType, input.targetId);

      return {
        ok: true as const,
        campaignId: campaign.id,
        mocoPaid: 0,
        expiresAt: input.expiresAt,
      };
    });

    if (!result.ok) return result;

    revalidatePath("/events");
    revalidatePath("/");
    return result;
  } catch (e) {
    throw e;
  }
}

const campaignSelect = {
  id: true,
  days: true,
  mocoPaid: true,
  mocoPaidTenths: true,
  startsAt: true,
  expiresAt: true,
  status: true,
  createdAt: true,
} as const;

export async function getSponsoredAdStatus(
  targetType: SponsoredAdTargetType,
  targetId: string
) {
  const campaign = await db.sponsoredAdCampaign.findFirst({
    where: { targetType, targetId },
    orderBy: { createdAt: "desc" },
    select: campaignSelect,
  });

  if (!campaign) return { active: false as const, campaign: null };

  const now = new Date();
  const complimentary = isComplimentaryCampaign(campaign);
  const active =
    campaign.status === SPONSORED_AD_STATUS_ACTIVE &&
    (complimentary || campaign.expiresAt > now);

  return {
    active,
    campaign: {
      id: campaign.id,
      days: campaign.days,
      mocoPaid: campaignPaidMoco(campaign),
      startsAt: campaign.startsAt,
      expiresAt: campaign.expiresAt,
      status: campaign.status,
      createdAt: campaign.createdAt,
    },
  };
}
