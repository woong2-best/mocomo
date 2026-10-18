import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { StudioPortfolioBlock } from "@/features/marketplace/studio-portfolio";

export type StudioMedia = { url: string; kind: "image" | "gif" | "video" };
export type { StudioPortfolioBlock };
export type StudioTier = { id: string; name: string; price: number };
export type StudioAddon = { id: string; name: string; mode: "fixed" | "percent"; amount: number };
export type StudioField = { id: string; label: string; kind: "text" | "image"; required: boolean };

export type StudioCard = {
  id: string;
  sellerId: string;
  category: string;
  title: string;
  about: string;
  open: boolean;
  slotCap: number;
  slotsUsed: number;
  accepting: boolean;
  deliveryDays: number;
  revisionNote: string;
  currency: string;
  coverUrl?: string;
  blocks?: StudioPortfolioBlock[];
  portfolio: StudioMedia[];
  tiers: StudioTier[];
  addons: StudioAddon[];
  formFields: StudioField[];
  fromPrice: number;
  seller: { id: string; username: string; image: string | null };
};

export type StudioDraft = {
  category: string;
  title: string;
  about: string;
  open: boolean;
  slotCap: number;
  deliveryDays: number;
  revisionNote: string;
  currency: string;
  coverUrl: string;
  blocks: StudioPortfolioBlock[];
  portfolio?: StudioMedia[];
  tiers: StudioTier[];
  addons: StudioAddon[];
  formFields: StudioField[];
};

export function fetchStudios(q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const query = params.toString();
  return apiRequest<{ items: StudioCard[] }>(`${MobileApi.studios}${query ? `?${query}` : ""}`);
}

export function fetchStudio(id: string) {
  return apiRequest<{
    studio: StudioCard;
    myOrder: { id: string; status: string; listingId: string | null; roomId: string | null; lateCancel: boolean } | null;
  }>(MobileApi.studio(id), { auth: true });
}

export function fetchMyStudio() {
  return apiRequest<{ studio: StudioCard | null }>(MobileApi.studioMine, { auth: true });
}

export function saveStudio(body: StudioDraft) {
  return apiRequest<{ studio: StudioCard }>(MobileApi.studioMine, { method: "PUT", auth: true, body });
}

export function orderStudio(
  id: string,
  body: { tierId: string; addonIds: string[]; answers: Record<string, string>; agreed: true }
) {
  return apiRequest<{ id: string; listingId: string; roomId: string; price: number }>(MobileApi.studioOrder(id), {
    method: "POST",
    auth: true,
    body,
  });
}

export function joinStudioWaitlist(id: string) {
  return apiRequest<{ ok: true }>(MobileApi.studioWaitlist(id), { method: "POST", auth: true, body: {} });
}

export function lateCancelStudio(orderId: string) {
  return apiRequest<{ ok: true }>(MobileApi.studioLateCancel(orderId), { method: "POST", auth: true, body: {} });
}
