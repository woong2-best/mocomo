import { db } from "@/lib/db";

export const STRIPE_ACCOUNT_NOT_READY = "STRIPE_ACCOUNT_NOT_READY" as const;

export const STRIPE_ACCOUNT_NOT_READY_MESSAGE =
  "Target creator has not completed Stripe Connect payout setup.";

/** Donor-facing body. `message` is the only prose field; clients localize from `code`. */
export function stripeAccountNotReadyPayload() {
  return {
    code: STRIPE_ACCOUNT_NOT_READY,
    message: STRIPE_ACCOUNT_NOT_READY_MESSAGE,
  } as const;
}

/** 후원 버튼 비활성 안내 */
export const CREATOR_PAYOUT_BLOCKED_KO =
  "해당 크리에이터가 아직 정산 계좌(Stripe)를 연동하지 않아 후원할 수 없습니다.";

/** API 에러 코드 수신 시 토스트 */
export const CREATOR_PAYOUT_BLOCKED_TOAST_KO =
  "해당 크리에이터가 정산 계좌를 연동하지 않아 후원할 수 없습니다.";

export type StripeAccountNotReady = {
  ok: false;
  code: typeof STRIPE_ACCOUNT_NOT_READY;
  error: typeof STRIPE_ACCOUNT_NOT_READY_MESSAGE;
};

/** Stripe Connect payouts_enabled 스냅샷. 프로필 거주 국가는 보지 않는다. */
export async function isCreatorPayoutsEnabled(userId: string): Promise<boolean> {
  const profile = await db.creatorSettlementProfile.findUnique({
    where: { userId },
    select: { payoutsEnabled: true },
  });
  return profile?.payoutsEnabled === true;
}

export async function assertCreatorPayoutsEnabled(
  userId: string
): Promise<{ ok: true } | StripeAccountNotReady> {
  if (await isCreatorPayoutsEnabled(userId)) return { ok: true };
  return {
    ok: false,
    code: STRIPE_ACCOUNT_NOT_READY,
    error: STRIPE_ACCOUNT_NOT_READY_MESSAGE,
  };
}

/** user id 또는 라이브 채널 id */
export async function isPayoutTargetReady(targetId: string): Promise<boolean> {
  const id = targetId.trim();
  if (!id) return false;

  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (user) return isCreatorPayoutsEnabled(user.id);

  const channel = await db.voiceChannel.findUnique({
    where: { id },
    select: { createdBy: true },
  });
  if (!channel) return false;
  return isCreatorPayoutsEnabled(channel.createdBy);
}
