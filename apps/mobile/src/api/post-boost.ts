import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type BoostPreset = { days: number; moco: number };

export type BoostRefundQuote = {
  elapsedHours: number;
  usedDays: number;
  unusedDays: number;
  refundMoco: number;
  totalDays: number;
};

export type PostBoostStatus = {
  mocoPerDay: number;
  maxDays: number;
  presets: BoostPreset[];
  boostable: boolean;
  owned: boolean;
  purchasedMoco: number;
  purchasedMocoBalance?: number;
  active: boolean;
  campaign: { id: string; days: number; expiresAt: string } | null;
  refund: BoostRefundQuote | null;
};

export async function fetchPostBoostStatus(postId: string): Promise<PostBoostStatus> {
  const params = new URLSearchParams({ postId });
  return apiRequest<PostBoostStatus>(`${MobileApi.adsBoost}?${params}`, { auth: true });
}

export async function boostPost(postId: string, days: number) {
  return apiRequest<{ ok: boolean; campaignId: string; mocoPaid: number; expiresAt: string }>(
    MobileApi.adsBoost,
    { method: "POST", body: { postId, days }, auth: true }
  );
}

export async function cancelPostBoost(postId: string) {
  return apiRequest<{
    ok: boolean;
    campaignId: string;
    refundMoco: number;
    usedDays: number;
    unusedDays: number;
    totalDays: number;
  }>(MobileApi.adsCancel, { method: "POST", body: { postId }, auth: true });
}
