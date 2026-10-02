import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type OnDemandWithdrawQuote = {
  withdrawMoco: number;
  balanceBeforeMoco: number;
  balanceAfterMoco: number;
  activeTierBefore: string;
  activeTierAfter: string;
  payoutTier: string;
  faceValueCents: number;
  platformMarginCents: number;
  netTransferCents: number;
  platformFeePercent: number;
  activeTierBeforeFeePercent: number;
  activeTierAfterFeePercent: number;
  tierDowngrade: boolean;
  transfer: {
    currency: string;
    grossMinor: number;
    withholdingMinor: number;
    netMinor: number;
  };
};

export async function fetchOnDemandWithdrawQuote(withdrawMoco: number) {
  return apiRequest<OnDemandWithdrawQuote>(MobileApi.settlementOnDemandQuote, {
    method: "POST",
    body: { withdrawMoco },
    auth: true,
  });
}

export async function submitOnDemandWithdraw(withdrawMoco: number, idempotencyKey: string) {
  return apiRequest<{ withdrawalId: string; stripeTransferId: string }>(
    MobileApi.settlementOnDemandWithdraw,
    {
      method: "POST",
      body: { withdrawMoco },
      auth: true,
      headers: { "X-Idempotency-Key": idempotencyKey },
    },
  );
}

export type SettlementHistoryItem =
  | {
      kind: "monthly_cycle";
      id: string;
      at: string;
      periodYear: number;
      periodMonth: number;
      status: string;
      lockedMoco: number;
      deductedMoco: number;
      rolloverMoco: number;
      netAmountMinor: number | null;
      currency: string | null;
    }
  | {
      kind: "on_demand_withdrawal";
      id: string;
      at: string;
      status: string;
      withdrawMoco: number;
      balanceAfterMoco: number;
      payoutTier: string;
      activeTierBefore: string;
      activeTierAfter: string;
      netAmountMinor: number;
      currency: string;
      stripeTransferId: string | null;
    };

export type SettlementHistoryPage = {
  items: SettlementHistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchSettlementHistoryPage(opts?: {
  limit?: number;
  cursor?: string | null;
}) {
  const limit = opts?.limit ?? 20;
  const params = new URLSearchParams({ limit: String(limit) });
  if (opts?.cursor) params.set("cursor", opts.cursor);
  return apiRequest<SettlementHistoryPage>(`${MobileApi.settlementHistory}?${params.toString()}`, {
    auth: true,
  });
}

/** @deprecated fetchSettlementHistoryPage */
export async function fetchSettlementHistory(limit = 40) {
  const page = await fetchSettlementHistoryPage({ limit });
  return { items: page.items };
}
