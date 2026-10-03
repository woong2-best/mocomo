import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type AuctionDepositStatus = {
  depositRequiredMoco: number;
  depositRequiredUsd: number;
  minWalletMoco: number;
  canParticipate: boolean;
  mocoUsdValue: number;
  availableMocoBalance: number;
  lockedMocoBalance: number;
  sellerHarmScoreTotal: number;
};

export async function fetchAuctionDepositStatus(listingId?: string) {
  const qs = listingId ? `?listingId=${encodeURIComponent(listingId)}` : "";
  return apiRequest<AuctionDepositStatus>(`${MobileApi.marketplaceAuctionDeposit}${qs}`, {
    auth: true,
  });
}

