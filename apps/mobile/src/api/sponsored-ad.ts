import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export async function fetchSponsoredAdStatus(eventId: string, days?: number) {
  const params = new URLSearchParams({
    targetType: "EVENT",
    targetId: eventId,
  });
  if (days) params.set("days", String(days));
  return apiRequest<{
    mocoPerDay: number;
    maxDays: number;
    purchasedMocoBalance: number;
    quoteMoco: number | null;
    canAfford: boolean | null;
    active: boolean;
    campaign: { expiresAt: string } | null;
  }>(`${MobileApi.sponsoredAdStatus}?${params}`, { auth: true });
}

export async function purchaseEventSponsoredAd(eventId: string, days: number) {
  return apiRequest<{ ok: boolean; campaignId: string; mocoPaid: number; expiresAt: string }>(
    MobileApi.sponsoredAdPurchase,
    {
      method: "POST",
      body: { targetType: "EVENT", targetId: eventId, days },
      auth: true,
    }
  );
}
