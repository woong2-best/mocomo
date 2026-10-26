import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type SupportTierRow = {
  level: string;
  label: string;
  labelKo: string;
  minAmount: number;
  color: string;
  iconUrl: string;
};

export type SupportedUserAtTier = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  totalAmount: number;
};

export type SupportTiersPayload = {
  totalSupportSent: number;
  supportTierSent: string;
  earnedMocoTier: string;
  current: { level: string; label: string; labelKo: string; minAmount: number };
  next: { level: string; labelKo: string; minAmount: number; remaining: number } | null;
  progress: { message: string; progress: number };
  selectedTier?: string | null;
  supportedUsers?: SupportedUserAtTier[];
  tiers: SupportTierRow[];
};

export async function fetchSupportTiers(tier?: string | null) {
  const suffix = tier ? `?tier=${encodeURIComponent(tier)}` : "";
  return apiRequest<SupportTiersPayload>(`${MobileApi.supportTiers}${suffix}`, { auth: true });
}
