import * as Linking from "expo-linking";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type MobileSubscriptionRow = {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorName: string | null;
  amount: number;
  active: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
};

export async function fetchMySubscriptions() {
  return apiRequest<{ subscriptions: MobileSubscriptionRow[] }>(MobileApi.subscriptions, {
    auth: true,
  });
}

export async function startSubscriptionCheckout(input: {
  creatorId: string;
  username: string;
  amount: number;
}) {
  return apiRequest<{ checkoutUrl: string; orderId: string }>(MobileApi.subscriptions, {
    method: "POST",
    body: {
      action: "checkout",
      ...input,
      purchaseTermsAccepted: true,
      recurringDonationTermsAccepted: true,
    },
    auth: true,
  });
}

export async function cancelSubscription(creatorId: string) {
  return apiRequest<{ success: true }>(MobileApi.subscriptions, {
    method: "POST",
    body: { action: "cancel", creatorId },
    auth: true,
  });
}

/** External browser for Stripe subscription checkout (no WebView) */
export async function openSubscriptionCheckout(input: {
  creatorId: string;
  username: string;
  amount: number;
}) {
  const { checkoutUrl } = await startSubscriptionCheckout(input);
  await Linking.openURL(checkoutUrl);
}
