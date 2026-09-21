/** CreatorRewardPayoutBatch.status 값 */
export const REWARD_BATCH_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  /** Connect → 은행 Payout 실패 (Transfer는 성공) */
  PAYOUT_FAILED: "PAYOUT_FAILED",
  /** Webhook 실패 후 재시도 대기 */
  RETRY_PENDING: "RETRY_PENDING",
  /** Express 온보딩/계좌 미완료 */
  SKIPPED_UNONBOARDED: "SKIPPED_UNONBOARDED",
  /** Stripe Tax Reporting 세무 정보 미비 */
  SKIPPED_TAX_INCOMPLETE: "SKIPPED_TAX_INCOMPLETE",
  SKIPPED_BELOW_MINIMUM: "SKIPPED_BELOW_MINIMUM",
  /** 레거시 포괄 스킵 */
  SKIPPED: "SKIPPED",
} as const;

export type RewardBatchStatus =
  (typeof REWARD_BATCH_STATUS)[keyof typeof REWARD_BATCH_STATUS];

/** Transfer 재시도 대상 (MOCO 이미 차감됨) */
export const REWARD_RETRYABLE_STATUSES: readonly string[] = [
  REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED,
  REWARD_BATCH_STATUS.SKIPPED_TAX_INCOMPLETE,
  REWARD_BATCH_STATUS.FAILED,
  REWARD_BATCH_STATUS.RETRY_PENDING,
];

export const MAX_REWARD_TRANSFER_RETRIES = 5;
