import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type CommissionItem = {
  id: string;
  brief: string;
  purpose: string;
  status: string;
  price: number | null;
  currency: string;
  estimatedDays: number | null;
  listingId: string | null;
  roomId: string | null;
  buyer: { id: string; username: string };
  seller: { id: string; username: string };
  mine: "buyer" | "seller";
};

export function fetchCommissions() {
  return apiRequest<{ items: CommissionItem[] }>(MobileApi.commissions, { auth: true });
}

export function sendCommission(body: {
  sellerId: string;
  brief: string;
  purpose: "broadcast" | "personal";
  referenceUrls?: string[];
}) {
  return apiRequest<{ id: string }>(MobileApi.commissions, { method: "POST", auth: true, body });
}

export function answerCommission(body: {
  id: string;
  action: "accept" | "decline";
  price?: number;
  estimatedDays?: number;
}) {
  return apiRequest<{ ok: true; listingId?: string; roomId?: string | null }>(MobileApi.commissions, {
    method: "POST",
    auth: true,
    body,
  });
}
