"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  bulkGoldShopAction,
  createGoldShopOffer,
  deleteGoldShopOffers,
  getAdminGoldShopDetail,
  listAdminGoldShopOffers,
  listShopEligibleItems,
  toggleGoldShopField,
  updateGoldShopOffer,
  type BulkGoldShopAction,
} from "@/lib/apt/economy/admin-gold-shop-service";

const SHOP_PATH = "/admin/economy/shop";

function revalidate() {
  revalidatePath(SHOP_PATH);
  revalidatePath("/admin/economy");
}

export async function getGoldShopAdminPageData() {
  await requireAdmin();
  const { seedGoldShopOffers } = await import("@/lib/apt/economy/gold-shop-service");
  let offers = await listAdminGoldShopOffers();
  if (offers.length === 0) {
    await seedGoldShopOffers();
    offers = await listAdminGoldShopOffers();
  }
  const catalogItems = listShopEligibleItems();
  return { offers, catalogItems };
}

export async function getGoldShopAdminDetail(offerId: string) {
  await requireAdmin();
  return getAdminGoldShopDetail(offerId);
}

export async function adminToggleGoldShopField(
  offerId: string,
  field: "featured" | "isNew" | "enabled" | "isLimited",
  value: boolean
) {
  const admin = await requireAdmin();
  const offer = await toggleGoldShopField(offerId, admin.id, field, value);
  revalidate();
  return offer;
}

export async function adminUpdateGoldShopOffer(
  offerId: string,
  patch: Parameters<typeof updateGoldShopOffer>[2]
) {
  const admin = await requireAdmin();
  const offer = await updateGoldShopOffer(offerId, admin.id, patch);
  revalidate();
  return offer;
}

export async function adminCreateGoldShopOffer(
  input: Parameters<typeof createGoldShopOffer>[1]
) {
  const admin = await requireAdmin();
  const res = await createGoldShopOffer(admin.id, input);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminBulkGoldShopAction(offerIds: string[], action: BulkGoldShopAction) {
  const admin = await requireAdmin();
  const count = await bulkGoldShopAction(offerIds, admin.id, action);
  revalidate();
  return { count };
}

export async function adminDeleteGoldShopOffers(offerIds: string[]) {
  const admin = await requireAdmin();
  const count = await deleteGoldShopOffers(offerIds, admin.id);
  revalidate();
  return { count };
}
