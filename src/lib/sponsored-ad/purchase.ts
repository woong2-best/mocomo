/**
 * 스폰서드 광고 MOCO 결제 — purchasedMoco Burn + MocoTransactionHistory
 */

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getMocoBalanceSnapshot } from "@/lib/auction-deposit/service";
import {
  adPurchaseReason,
  burnPurchasedMocoWithHistory,
} from "@/lib/moco/transaction-history";
import {
  calcSponsoredAdExpiresAt,
  calcSponsoredAdMoco,
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_STATUS_ACTIVE,
  SPONSORED_AD_TARGET_EVENT,
  type SponsoredAdTargetType,
} from "@/lib/sponsored-ad/constants";

type Tx = Prisma.TransactionClient;

const INSUFFICIENT_MOCO = "구매 MOCO 잔액이 부족합니다.";

async function validateTarget(
  tx: Tx,
  userId: string,
  targetType: SponsoredAdTargetType,
  targetId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (targetType === SPONSORED_AD_TARGET_EVENT) {
    const event = await tx.event.findUnique({ where: { id: targetId } });
    if (!event || event.createdById !== userId) {
      return { ok: false, error: "이벤트를 찾을 수 없습니다." };
    }
    if (event.registrationFeePaid) {
      return { ok: false, error: "이미 등록·광고가 활성화된 이벤트입니다." };
    }
    return { ok: true };
  }
  return { ok: false, error: "지원하지 않는 광고 대상입니다." };
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
};

export type PurchaseSponsoredAdResult =
  | {
      ok: true;
      campaignId: string;
      mocoPaid: number;
      expiresAt: Date;
    }
  | { ok: false; error: string };

export async function purchaseSponsoredAd(
  input: PurchaseSponsoredAdInput
): Promise<PurchaseSponsoredAdResult> {
  let mocoPaid: number;
  try {
    mocoPaid = calcSponsoredAdMoco(input.days);
  } catch {
    return { ok: false, error: `광고 기간은 1~${SPONSORED_AD_MAX_DAYS}일까지 선택할 수 있습니다.` };
  }

  const balance = await getMocoBalanceSnapshot(input.userId);
  if (balance.availableMocoBalance < mocoPaid) {
    return { ok: false, error: INSUFFICIENT_MOCO };
  }

  const activeCampaign = await db.sponsoredAdCampaign.findFirst({
    where: {
      targetType: input.targetType,
      targetId: input.targetId,
      status: SPONSORED_AD_STATUS_ACTIVE,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (activeCampaign) {
    return { ok: false, error: "이미 활성화된 스폰서드 광고가 있습니다." };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const validated = await validateTarget(tx, input.userId, input.targetType, input.targetId);
      if (!validated.ok) return validated;

      const startsAt = new Date();
      const expiresAt = calcSponsoredAdExpiresAt(input.days, startsAt);

      const campaign = await tx.sponsoredAdCampaign.create({
        data: {
          userId: input.userId,
          targetType: input.targetType,
          targetId: input.targetId,
          days: input.days,
          mocoPaid,
          startsAt,
          expiresAt,
          status: SPONSORED_AD_STATUS_ACTIVE,
        },
      });

      await burnPurchasedMocoWithHistory(tx, {
        userId: input.userId,
        amountMoco: mocoPaid,
        type: "AD_PURCHASE",
        reason: adPurchaseReason(input.days),
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
    return result;
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_MOCO") {
      return { ok: false, error: INSUFFICIENT_MOCO };
    }
    throw e;
  }
}

export async function getSponsoredAdStatus(
  targetType: SponsoredAdTargetType,
  targetId: string
) {
  const campaign = await db.sponsoredAdCampaign.findFirst({
    where: { targetType, targetId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      days: true,
      mocoPaid: true,
      startsAt: true,
      expiresAt: true,
      status: true,
      createdAt: true,
    },
  });

  if (!campaign) return { active: false as const, campaign: null };

  const now = new Date();
  const active =
    campaign.status === SPONSORED_AD_STATUS_ACTIVE && campaign.expiresAt > now;

  return { active, campaign };
}
