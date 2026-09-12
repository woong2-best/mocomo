import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type GemPurchaseRow = {
  id: string;
  gems: number;
  remainingGems: number;
  krwAmount: number;
  refunded: boolean;
  refundedUsd: number | null;
  createdAt: string;
};

export type GemsWalletResponse = {
  balance: number;
  minTopupMoco: number;
  maxTopupMoco: number;
  termsCopy: string;
  purchases: GemPurchaseRow[];
};

export async function fetchGemsWallet() {
  return apiRequest<GemsWalletResponse>(MobileApi.gems, { auth: true });
}

export async function topupGems(moco: number) {
  return apiRequest<{ checkoutUrl: string; orderId: string }>(MobileApi.gems, {
    method: "POST",
    body: { action: "topup", moco, purchaseTermsAccepted: true },
    auth: true,
  });
}

/** @deprecated payCheckoutWithGems(orderId) from checkout-payment 사용 */
export async function payWithGemsMobile(input: { orderId: string }) {
  return apiRequest<{ success: true; type: string; redirectPath?: string; balance?: number }>(
    MobileApi.gems,
    {
      method: "POST",
      body: { action: "pay", orderId: input.orderId, purchaseTermsAccepted: true },
      auth: true,
    }
  );
}

export async function refundGemPurchase(gemPurchaseId: string) {
  return apiRequest<{ success: true; status: string; refundedUsd: number }>(MobileApi.gems, {
    method: "POST",
    body: { action: "refund", gemPurchaseId },
    auth: true,
  });
}
