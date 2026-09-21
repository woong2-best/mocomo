import type Stripe from "stripe";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import {
  MAX_REWARD_TRANSFER_RETRIES,
  REWARD_BATCH_STATUS,
} from "@/lib/settlement-moco/payout-status";

function rewardBatchIdFromTransfer(transfer: Stripe.Transfer): string | null {
  return transfer.metadata?.rewardBatchId?.trim() || null;
}

async function findBatchForTransfer(transfer: Stripe.Transfer) {
  const metaId = rewardBatchIdFromTransfer(transfer);
  if (metaId) {
    const byId = await db.creatorRewardPayoutBatch.findUnique({ where: { id: metaId } });
    if (byId) return byId;
  }
  return db.creatorRewardPayoutBatch.findFirst({
    where: { stripeTransferId: transfer.id },
  });
}

async function findRecentCompletedBatchForConnectAccount(accountId: string) {
  const user = await db.user.findFirst({
    where: { stripeConnectAccountId: accountId },
    select: { id: true },
  });
  if (!user) return null;
  return db.creatorRewardPayoutBatch.findFirst({
    where: {
      userId: user.id,
      status: {
        in: [REWARD_BATCH_STATUS.COMPLETED, REWARD_BATCH_STATUS.PAYOUT_FAILED],
      },
      stripeTransferId: { not: null },
    },
    orderBy: { completedAt: "desc" },
  });
}

/**
 * transfer.reversed — 플랫폼→Connect Transfer가 취소/반환된 경우
 * (Stripe에 transfer.failed / transfer.paid 이벤트는 없음)
 * cron의 transfers.create 동기 실패는 payout.ts try/catch에서 FAILED 처리.
 */
export async function handleCreatorRewardTransferReversed(transfer: Stripe.Transfer) {
  if (transfer.metadata?.type && transfer.metadata.type !== "creator_reward") {
    return;
  }

  const batch = await findBatchForTransfer(transfer);
  if (!batch) return;

  const canRetry = batch.retryCount < MAX_REWARD_TRANSFER_RETRIES;
  const failMsg =
    typeof transfer.destination === "string"
      ? `Transfer reversed (destination ${transfer.destination})`
      : "Stripe Transfer reversed";

  await db.creatorRewardPayoutBatch.update({
    where: { id: batch.id },
    data: {
      status: canRetry ? REWARD_BATCH_STATUS.RETRY_PENDING : REWARD_BATCH_STATUS.FAILED,
      errorMessage: failMsg,
      skipReason: canRetry ? "transfer_reversed_retryable" : "transfer_reversed",
      // 반환된 Transfer는 재사용 불가 — 재시도 시 신규 Transfer
      stripeTransferId: null,
      lastRetryAt: new Date(),
    },
  });

  await createNotification({
    userId: batch.userId,
    type: "system",
    title: "Reward 이체가 취소되었습니다",
    body: canRetry
      ? "다음 정산 주기 또는 온보딩 완료 후 자동으로 다시 시도합니다."
      : "고객센터에 문의해 주세요.",
    link: "/wallet",
  }).catch(() => null);
}

/** @deprecated handleCreatorRewardTransferReversed 사용 */
export async function handleCreatorRewardTransferFailed(transfer: Stripe.Transfer) {
  return handleCreatorRewardTransferReversed(transfer);
}

/**
 * payout.failed — Connect 계좌 → 은행 출금 실패
 * (플랫폼→Connect Transfer와 별개이므로 Transfer 재시도하지 않음)
 * Connect 계정 이벤트이므로 Webhook에서 "Listen to events on Connected accounts" 필요.
 */
export async function handleCreatorRewardPayoutFailed(
  payout: Stripe.Payout,
  connectAccountId?: string | null
) {
  let batch = payout.metadata?.rewardBatchId
    ? await db.creatorRewardPayoutBatch.findUnique({
        where: { id: payout.metadata.rewardBatchId },
      })
    : null;

  if (!batch && payout.id) {
    batch = await db.creatorRewardPayoutBatch.findFirst({
      where: { stripePayoutId: payout.id },
    });
  }

  if (!batch && connectAccountId) {
    batch = await findRecentCompletedBatchForConnectAccount(connectAccountId);
  }

  if (!batch) return;

  const failMsg = payout.failure_message || payout.failure_code || "Stripe Payout failed";
  await db.creatorRewardPayoutBatch.update({
    where: { id: batch.id },
    data: {
      status: REWARD_BATCH_STATUS.PAYOUT_FAILED,
      stripePayoutId: payout.id,
      errorMessage: failMsg,
      skipReason: "payout_failed",
    },
  });

  await createNotification({
    userId: batch.userId,
    type: "system",
    title: "은행 입금이 실패했습니다",
    body: "Stripe Express 대시보드에서 계좌 정보를 확인한 뒤 고객센터로 문의해 주세요.",
    link: "/wallet",
  }).catch(() => null);
}
