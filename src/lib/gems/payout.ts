import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import {
  GEMS_RATE_VERSION,
  GEM_TO_USD_RATE,
  PAYOUT_INSTANT_FROM_USD,
  PAYOUT_SKIP_BELOW_USD,
  PLATFORM_MARGIN_RATE,
  usdToStripeCents,
} from "@/lib/gems/constants";

function groupBy<T extends Record<string, unknown>>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function earliestDate(dates: Date[]): Date {
  return dates.reduce((min, d) => (d < min ? d : min), dates[0]!);
}

async function checkFraud(
  creatorId: string,
  totalUsd: number,
  eventCount: number
): Promise<boolean> {
  if (totalUsd >= 500 && eventCount >= 50) return true;

  const recentBatches = await db.creatorPayoutBatch.count({
    where: {
      creatorId,
      status: "held_for_review",
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  return recentBatches >= 2;
}

export type CreatorPayoutBatchResult = {
  processed: number;
  skipped: number;
  held: number;
  failed: number;
};

/** @deprecated MOCO 후원은 정산 MOCO 적립 → 월말 Reward 지급. 레거시 GiftEvent만 처리 */
export async function processCreatorPayouts(): Promise<CreatorPayoutBatchResult> {
  const unpayoutEvents = await db.giftEvent.findMany({
    where: { payoutBatchId: null },
  });

  const settlementCredited = await db.platformWalletLedger.findMany({
    where: {
      bucket: "SETTLEMENT_MOCO",
      referenceType: "gift_event",
      referenceId: { in: unpayoutEvents.map((e) => e.id) },
    },
    select: { referenceId: true },
  });
  const creditedIds = new Set(settlementCredited.map((r) => r.referenceId));
  const legacyEvents = unpayoutEvents.filter((e) => !creditedIds.has(e.id));

  const groupedByCreator = groupBy(legacyEvents, "creatorId");
  const result: CreatorPayoutBatchResult = {
    processed: 0,
    skipped: 0,
    held: 0,
    failed: 0,
  };

  for (const [creatorId, events] of Object.entries(groupedByCreator)) {
    const totalGems = events.reduce((sum, e) => sum + e.gems, 0);
    const totalUsd = totalGems * GEM_TO_USD_RATE;

    if (totalUsd < PAYOUT_SKIP_BELOW_USD) {
      result.skipped++;
      continue;
    }

    const creator = await db.user.findUnique({
      where: { id: creatorId },
      select: { stripeConnectAccountId: true },
    });
    if (!creator?.stripeConnectAccountId?.trim()) {
      result.skipped++;
      continue;
    }

    const isSuspicious = await checkFraud(creatorId, totalUsd, events.length);
    const batchStatus = isSuspicious ? "held_for_review" : "pending";
    const netPayoutUsd = totalUsd * (1 - PLATFORM_MARGIN_RATE);
    const payoutMethod = netPayoutUsd >= PAYOUT_INSTANT_FROM_USD ? "instant" : "standard";

    const batch = await db.creatorPayoutBatch.create({
      data: {
        creatorId,
        periodStart: earliestDate(events.map((e) => e.timestamp)),
        periodEnd: new Date(),
        giftEventCount: events.length,
        totalGems,
        totalUsd,
        netPayoutUsd,
        rateVersion: GEMS_RATE_VERSION,
        payoutMethod,
        status: batchStatus,
      },
    });

    if (isSuspicious) {
      result.held++;
      continue;
    }

    try {
      const stripe = getStripe();
      const connectAccountId = creator.stripeConnectAccountId.trim();

      const transfer = await stripe.transfers.create({
        amount: usdToStripeCents(netPayoutUsd),
        currency: "usd",
        destination: connectAccountId,
        transfer_group: batch.id,
      });

      const payout = await stripe.payouts.create(
        {
          amount: usdToStripeCents(netPayoutUsd),
          currency: "usd",
          method: payoutMethod,
        },
        { stripeAccount: connectAccountId }
      );

      await db.$transaction([
        db.creatorPayoutBatch.update({
          where: { id: batch.id },
          data: {
            status: "completed",
            stripeTransferId: transfer.id,
            stripePayoutId: payout.id,
          },
        }),
        db.giftEvent.updateMany({
          where: { id: { in: events.map((e) => e.id) } },
          data: { payoutBatchId: batch.id },
        }),
      ]);

      result.processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.creatorPayoutBatch.update({
        where: { id: batch.id },
        data: { status: "failed", errorMessage: message },
      });
      result.failed++;
    }
  }

  return result;
}
