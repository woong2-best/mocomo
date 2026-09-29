import { db } from "@/lib/db";
import {
  createExpressDashboardLink,
  createExpressOnboardingLink,
  startExpressConnectOnboarding,
  syncUserExpressConnectFromStripe,
} from "@/lib/settlement-express-connect";

export async function startWalletStripeConnectOnboarding(input: {
  userId: string;
  requestCardPayments?: boolean;
  payoutCountry?: string;
}) {
  return startExpressConnectOnboarding(input.userId, {
    requestCardPayments: input.requestCardPayments,
    payoutCountry: input.payoutCountry,
  });
}

export async function refreshWalletConnectLink(accountId: string) {
  return createExpressOnboardingLink(accountId);
}

export async function createWalletConnectDashboardLink(accountId: string) {
  return createExpressDashboardLink(accountId);
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
