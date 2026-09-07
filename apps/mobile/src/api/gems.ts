import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type GemPackage = { gems: number; usdCents: number; label: string };

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
  packages: GemPackage[];
  termsCopy: string;
  purchases: GemPurchaseRow[];
};

export async function fetchGemsWallet() {
  return apiRequest<GemsWalletResponse>(MobileApi.gems, { auth: true });
}

export async function topupGems(gems: number) {
  return apiRequest<{ checkoutUrl: string; orderId: string }>(MobileApi.gems, {
    method: "POST",
    body: { action: "topup", gems, purchaseTermsAccepted: true },
    auth: true,
  });
}

export async function payWithGemsMobile(input: {
  type: "TIP" | "POST_MEDIA";
  amount: number;
  metadata: Record<string, unknown>;
}) {
  return apiRequest<{ success: true; type: string; redirectPath?: string; balance?: number }>(
    MobileApi.gems,
    {
      method: "POST",
      body: { action: "pay", ...input },
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
