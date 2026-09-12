import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import {
  MIN_REWARD_PAYOUT_KRW,
  MIN_REWARD_PAYOUT_USD_CENTS,
} from "@/lib/settlement-moco/constants";
import { debitSettlementMocoForReward } from "@/lib/settlement-moco/economy";
import { achievedSettlementTier } from "@/lib/settlement-moco/tier-config";
import { calcTierRewardAmount } from "@/lib/settlement-moco/tax";

export type MonthlySettlementResult = {
  processed: number;
  skipped: number;
  failed: number;
  tierSkipped: number;
};

type RewardAmountBreakdown = ReturnType<typeof calcTierRewardAmount>;

function currentMonthPeriod(now = new Date()) {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function meetsMinimum(amount: RewardAmountBreakdown): boolean {
  if (amount.currency === "krw") return amount.netMinor >= MIN_REWARD_PAYOUT_KRW;
  if (amount.currency === "usd") return amount.netMinor >= MIN_REWARD_PAYOUT_USD_CENTS;
  return amount.netMinor >= 100;
}

/**
 * MonthlySettlementCron — 매월 1일 실행
 * earnedMoco 기준 최상위 등급 산정 → requiredMoco 차감 → rewardUsd 정산 → 잔여 이월
 */
export async function processMonthlySettlementCron(
  now = new Date()
): Promise<MonthlySettlementResult> {
  const { year, month } = currentMonthPeriod(now);
  const result: MonthlySettlementResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    tierSkipped: 0,
  };

  const wallets = await db.platformWallet.findMany({
    where: { settlementMocoPoints: { gt: 0 } },
    select: {
      userId: true,
      settlementMocoPoints: true,
      user: {
        select: {
          stripeConnectAccountId: true,
          stripeOnboardingCompleted: true,
          countryCode: true,
          creatorSettlementProfile: {
            select: { countryCode: true, payoutsEnabled: true },
          },
        },
      },
    },
  });

  const stripe = getStripe();

  for (const wallet of wallets) {
    const existing = await db.creatorRewardPayoutBatch.findUnique({
      where: {
        userId_periodYear_periodMonth: {
          userId: wallet.userId,
          periodYear: year,
          periodMonth: month,
        },
      },
    });
    if (existing) {
      result.skipped++;
      continue;
    }

    const earnedBefore = wallet.settlementMocoPoints;
    const achieved = achievedSettlementTier(earnedBefore);

    if (achieved.requiredMoco <= 0 || achieved.rewardUsd <= 0) {
      result.tierSkipped++;
      continue;
    }

    const profile = wallet.user.creatorSettlementProfile;
    const accountId = wallet.user.stripeConnectAccountId;
    const countryCode = profile?.countryCode ?? wallet.user.countryCode ?? "US";
    const canPayout =
      !!accountId && !!wallet.user.stripeOnboardingCompleted && !!profile?.payoutsEnabled;

    const amount = calcTierRewardAmount({
      rewardUsd: achieved.rewardUsd,
      countryCode,
    });

    const rolloverMoco = earnedBefore - achieved.requiredMoco;

    const batch = await db.creatorRewardPayoutBatch.create({
      data: {
        userId: wallet.userId,
        periodYear: year,
        periodMonth: month,
        settlementMocoBefore: earnedBefore,
        achievedTier: achieved.tier,
        deductedMoco: achieved.requiredMoco,
        rolloverMoco,
        rewardUsd: achieved.rewardUsd,
        grossAmountMinor: amount.grossMinor,
        withholdingMinor: amount.withholdingMinor,
        netAmountMinor: amount.netMinor,
        currency: amount.currency,
        status: canPayout && meetsMinimum(amount) ? "PENDING" : "SKIPPED",
      },
    });

    await debitSettlementMocoForReward({
      userId: wallet.userId,
      deductAmount: achieved.requiredMoco,
      batchId: batch.id,
    });

    if (!canPayout) {
      result.skipped++;
      await db.creatorRewardPayoutBatch.update({
        where: { id: batch.id },
        data: { status: "SKIPPED", errorMessage: "정산 등록 미완료 — earnedMoco 차감·이월만 처리" },
      });
      continue;
    }

    if (!meetsMinimum(amount) || amount.netMinor <= 0) {
      result.skipped++;
      await db.creatorRewardPayoutBatch.update({
        where: { id: batch.id },
        data: { status: "SKIPPED", errorMessage: "최소 지급 금액 미달" },
      });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: amount.netMinor,
        currency: amount.currency,
        destination: accountId,
        metadata: {
          mocomoUserId: wallet.userId,
          rewardBatchId: batch.id,
          period: `${year}-${String(month).padStart(2, "0")}`,
          type: "creator_reward",
          achievedTier: achieved.tier,
          deductedMoco: String(achieved.requiredMoco),
          rolloverMoco: String(rolloverMoco),
        },
      });

      await db.creatorRewardPayoutBatch.update({
        where: { id: batch.id },
        data: {
          status: "COMPLETED",
          stripeTransferId: transfer.id,
          completedAt: new Date(),
        },
      });

      result.processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transfer failed";
      await db.creatorRewardPayoutBatch.update({
        where: { id: batch.id },
        data: { status: "FAILED", errorMessage: msg },
      });
      result.failed++;
    }
  }

  return result;
}

/** @deprecated processMonthlySettlementCron 사용 */
export async function processMonthlyRewardPayouts(now = new Date()) {
  const r = await processMonthlySettlementCron(now);
  return { processed: r.processed, skipped: r.skipped, failed: r.failed };
}
