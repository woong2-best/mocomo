import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type StripeConnectStatus = {
  stripeOnboardingCompleted: boolean;
  stripeConnectAccountId: string | null;
};

export async function fetchStripeConnectStatus() {
  return apiRequest<StripeConnectStatus>(MobileApi.stripeConnect, { auth: true });
}

export async function startStripeConnectOnboarding(returnTo?: string) {
  return apiRequest<{ url: string; accountId?: string } | { error: string }>(MobileApi.stripeConnect, {
    method: "POST",
    body: returnTo ? { returnTo } : {},
    auth: true,
  });
}

export async function fetchStripeConnectDashboard() {
  return apiRequest<{ url: string } | { error: string }>(MobileApi.stripeConnectDashboard, { auth: true });
}
