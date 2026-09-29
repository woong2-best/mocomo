import { apiRequest } from "@/api/client";
import type { DirectTradeView } from "@/api/messages";
import { MobileApi } from "@/api/paths";

export type DirectTradeActionBody = {
  listingId: string;
  action: "proposeMeet" | "acceptMeet" | "adjustMeet" | "verifyArrival" | "reportNoShow" | "submitPin";
  meetAt?: string;
  direction?: "earlier" | "later";
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number | null;
  failure?: "PERMISSION_DENIED" | "GPS_FAILED";
  pin?: string;
};

export async function fetchDirectTrades() {
  return apiRequest<{ trades: DirectTradeView[] }>(MobileApi.marketplaceDirectTrades, { auth: true });
}

export async function postDirectTrade(body: DirectTradeActionBody) {
  return apiRequest<{ view: DirectTradeView; error?: string }>(MobileApi.marketplaceDirectTrades, {
    method: "POST",
    auth: true,
    body,
  });
}
