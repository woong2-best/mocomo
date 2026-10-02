"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  adminCancelListing,
  adminExtendListingExpiry,
  adminFlagListingSuspicious,
  adminFreezeUser,
  adminHideListing,
  adminIgnoreFraudUser,
  adminNpcBuyListing,
  adminRefundSoldListing,
  adminUnfreezeUser,
  adminUpdateListingPrice,
  adminUpdateMarketEmergency,
  deleteNpcIntervention,
  getMarketAdminPageData,
  getMarketListingDetail,
  listMarketAdminLogs,
  upsertNpcIntervention,
} from "@/lib/apt/economy/admin-market-service";
import type { MarketAdminFlags } from "@/lib/apt/economy/market-admin-guards";

const PATH = "/admin/economy/market";

function revalidate() {
  revalidatePath(PATH);
}

export async function getMarketAdminPageDataAction() {
  await requireAdmin();
  return getMarketAdminPageData();
}

export async function getMarketListingDetailAction(listingId: string) {
  await requireAdmin();
  return getMarketListingDetail(listingId);
}

export async function getMarketAdminLogsAction() {
  await requireAdmin();
  return listMarketAdminLogs(50);
}

export async function adminMarketHideListing(listingId: string, hide: boolean, reason: string) {
  const admin = await requireAdmin();
  const res = await adminHideListing(listingId, admin.id, reason, hide);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminMarketCancelListing(listingId: string, reason: string) {
  const admin = await requireAdmin();
  const res = await adminCancelListing(listingId, admin.id, reason);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminMarketUpdatePrice(listingId: string, priceGold: number, reason: string) {
  const admin = await requireAdmin();
  const res = await adminUpdateListingPrice(listingId, admin.id, priceGold, reason);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminMarketExtendExpiry(listingId: string, extraDays: number, reason: string) {
  const admin = await requireAdmin();
  const res = await adminExtendListingExpiry(listingId, admin.id, extraDays, reason);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminMarketFlagSuspicious(listingId: string, flag: boolean, reason: string) {
  const admin = await requireAdmin();
  await adminFlagListingSuspicious(listingId, admin.id, flag, reason);
  revalidate();
  return { ok: true as const };
}

export async function adminMarketNpcBuy(listingId: string, reason: string) {
  const admin = await requireAdmin();
  const res = await adminNpcBuyListing(listingId, admin.id, reason);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminMarketRefund(listingId: string, reason: string) {
  const admin = await requireAdmin();
  const res = await adminRefundSoldListing(listingId, admin.id, reason);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminMarketEmergency(flags: Partial<MarketAdminFlags>, reason: string) {
  const admin = await requireAdmin();
  const next = await adminUpdateMarketEmergency(admin.id, flags, reason);
  revalidate();
  return next;
}

export async function adminMarketFreezeSeller(sellerId: string, reason: string) {
  const admin = await requireAdmin();
  await adminFreezeUser(sellerId, admin.id, reason);
  revalidate();
  return { ok: true as const };
}

export async function adminMarketUnfreezeSeller(sellerId: string, reason: string) {
  const admin = await requireAdmin();
  await adminUnfreezeUser(sellerId, admin.id, reason);
  revalidate();
  return { ok: true as const };
}

export async function adminMarketIgnoreSeller(sellerId: string, days: number, reason: string) {
  const admin = await requireAdmin();
  await adminIgnoreFraudUser(sellerId, admin.id, days, reason);
  revalidate();
  return { ok: true as const };
}

export async function adminMarketUpsertNpc(input: {
  id?: string;
  stickerTypeId: string;
  mode: string;
  targetPrice?: number | null;
  maxQuantity?: number;
  enabled?: boolean;
}) {
  await requireAdmin();
  await upsertNpcIntervention(input);
  revalidate();
  return { ok: true as const };
}

export async function adminMarketDeleteNpc(id: string) {
  await requireAdmin();
  await deleteNpcIntervention(id);
  revalidate();
  return { ok: true as const };
}

export type { MarketAdminFlags };
