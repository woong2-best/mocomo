import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { FeedAd } from "@/api/feed";

export type { FeedAd };

export async function fetchReelsAds(): Promise<FeedAd[]> {
  try {
    const res = await apiRequest<{ ads: FeedAd[] }>(MobileApi.ads, { auth: true });
    return Array.isArray(res.ads) ? res.ads : [];
  } catch {
    return [];
  }
}
