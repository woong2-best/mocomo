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

export const AUCTION_INSUFFICIENT_WALLET_MSG =
  "지갑에 최소 2 MOCO 이상 있어야 경매에 참여할 수 있습니다. MOCO를 충전한 뒤 다시 시도해 주세요.";
