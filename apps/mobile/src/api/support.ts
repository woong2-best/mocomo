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

export type SupportTiersPayload = {
  totalSupportSent: number;
  supportTierSent: string;
  earnedMocoTier: string;
  current: { level: string; label: string; labelKo: string; minAmount: number };
  next: { level: string; labelKo: string; minAmount: number; remaining: number } | null;
  progress: { message: string; progress: number };
  tiers: SupportTierRow[];
};

export async function fetchSupportTiers() {
  return apiRequest<SupportTiersPayload>(MobileApi.supportTiers, { auth: true });
}
