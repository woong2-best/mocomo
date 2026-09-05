import { apiRequest } from "@/api/client";

export type WtbAlertItem = {
  id: string;
  workTitle: string | null;
  animeSlug: string | null;
  productType: string | null;
  characterName: string | null;
  maxPrice: number | null;
  currency: string;
  note: string | null;
  createdAt: string;
};

export type SaleStatRecord = {
  id: string;
  soldPrice: number;
  currency: string;
  soldAt: string;
  listingFormat: string | null;
  characterName: string | null;
  productType: string | null;
};

export async function fetchMyWtbAlerts() {
  return apiRequest<{ items: WtbAlertItem[] }>("/api/mobile/subculture/wtb", { auth: true });
}

export async function createWtbAlert(body: {
  workTitle?: string;
  animeSlug?: string;
  productType?: string;
  characterName?: string;
  maxPrice?: number;
  currency?: string;
  note?: string;
}) {
  return apiRequest<{ alertId: string }>("/api/mobile/subculture/wtb", {
    method: "POST",
    auth: true,
    body,
  });
}

export async function removeWtbAlert(id: string) {
  return apiRequest<{ success: boolean }>(`/api/mobile/subculture/wtb/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function fetchSubcultureSales(query: {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
  characterName?: string | null;
}) {
  const params = new URLSearchParams();
  if (query.animeSlug) params.set("anime", query.animeSlug);
  else if (query.workTitle) params.set("work", query.workTitle);
  if (query.productType) params.set("product", query.productType);
  if (query.characterName) params.set("character", query.characterName);
  return apiRequest<{
    records: SaleStatRecord[];
    median: number | null;
    count: number;
  }>(`/api/subculture/sales?${params.toString()}`);
}
