import { db } from "@/lib/db";
import {
  createExpressOnboardingLink,
  startExpressConnectOnboarding,
  syncUserExpressConnectFromStripe,
} from "@/lib/settlement-express-connect";

export async function startWalletStripeConnectOnboarding(input: {
  userId: string;
  requestCardPayments?: boolean;
}) {
  return startExpressConnectOnboarding(input.userId, {
    requestCardPayments: input.requestCardPayments,
  });
}

export async function refreshWalletConnectLink(accountId: string) {
  return createExpressOnboardingLink(accountId);
}

export async function syncWalletConnectFromStripe(userId: string, accountId: string) {
  return syncUserExpressConnectFromStripe(userId, accountId);
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
