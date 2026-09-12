import { db } from "@/lib/db";
import { pullAndSyncStripeConnectAccount } from "@/lib/stripe-connect";

/** @deprecated Express 온보딩 제거 — registerCreatorSettlement 사용 */
export async function startWalletStripeConnectOnboarding(_input: {
  userId: string;
}): Promise<{ error: string }> {
  return { error: "Stripe 온보딩 페이지는 사용하지 않습니다. 마이페이지에서 정산 등록을 완료해 주세요." };
}

/** @deprecated Custom 화이트라벨 — Stripe 대시보드 미사용 */
export async function createWalletConnectDashboardLink(_accountId: string): Promise<{ error: string }> {
  return { error: "정산 계좌는 MoCoMo 마이페이지에서 관리합니다." };
}

export async function refreshWalletConnectLink(_accountId: string) {
  return startWalletStripeConnectOnboarding({ userId: "" });
}

export type WalletStripeConnectStatus = {
  stripeConnectAccountId: string | null;
  stripeOnboardingCompleted: boolean;
};

export async function getWalletStripeConnectStatus(
  userId: string
): Promise<WalletStripeConnectStatus> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      stripeConnectAccountId: true,
      stripeOnboardingCompleted: true,
    },
  });
  return {
    stripeConnectAccountId: user?.stripeConnectAccountId ?? null,
    stripeOnboardingCompleted: !!user?.stripeOnboardingCompleted,
  };
}

export async function syncWalletConnectFromStripe(userId: string, accountId: string) {
  const snap = await pullAndSyncStripeConnectAccount(accountId);
  if (snap?.readyForPayouts) {
    await db.user.update({
      where: { id: userId },
      data: {
        stripeOnboardingCompleted: true,
        stripeConnectOnboardedAt: new Date(),
      },
    });
    await db.creatorSettlementProfile.updateMany({
      where: { userId },
      data: { payoutsEnabled: true },
    });
  }
  return snap;
}
