import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type PaymentIntentType =
  | "TIP"
  | "PRODUCT"
  | "PREMIUM"
  | "EMOTICON"
  | "LISTING_FEE"
  | "PHYSICAL_GOODS"
  | "EVENT_REGISTRATION"
  | "CREATOR_EPISODE"
  | "POST_MEDIA"
  | "CREATOR_SUBSCRIPTION"
  | "STUDIO_ASSET"
  | "MARKETPLACE"
  | "CALL_BOOKING";

export type CheckoutBody = {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
};

export type CheckoutMeta = {
  configured: boolean;
  premiumUsdCents: number;
};

export async function fetchCheckoutMeta() {
  return apiRequest<CheckoutMeta>(MobileApi.checkout, { auth: false });
}

export async function createCheckout(body: CheckoutBody) {
  return apiRequest<{ checkoutUrl: string; orderId: string }>(MobileApi.checkout, {
    method: "POST",
    body,
  });
}

export async function confirmCheckout(sessionId: string) {
  return apiRequest<{ ok: true; type: string; alreadyPaid?: boolean }>(MobileApi.checkoutConfirm, {
    method: "POST",
    body: { sessionId },
  });
}
