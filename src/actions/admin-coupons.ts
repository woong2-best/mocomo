import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

"use server";

import { revalidatePath } from "next/cache";
import type { CouponAudience, CouponBenefitType } from "@prisma/client";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import {
  assignCouponToUsers,
  createCoupon,
  deactivateCoupon,
  deleteCoupon,
  exportCouponsCsv,
  getCouponDetail,
  getMyCoupons,
  listCoupons,
  searchUsersForCoupon,
  updateCoupon,
  type CouponListQuery,
  type CreateCouponInput,
} from "@/lib/admin/services/coupons";
import { requireAuth } from "@/lib/auth";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) {
    return e.status === 401 ? t("actions.s1mzxopt") : t("actions.st3onev");
  }
  return e instanceof Error ? e.message : t("actions.s1su4v2o");
}

export async function adminListCouponsAction(query: CouponListQuery) {
  try {
    await requireAdminPermission("coupons");
    return { ok: true as const, data: await listCoupons(query) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminGetCouponAction(id: string) {
  try {
    await requireAdminPermission("coupons");
    const data = await getCouponDetail(id);
    if (!data) return { ok: false as const, error: t("actions.swb7p1p") };
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminCreateCouponAction(input: CreateCouponInput) {
  try {
    const actor = await requireAdminPermission("coupons.write");
    const res = await createCoupon(actor, input);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/coupons");
    return { success: true as const, id: res.coupon!.id };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminUpdateCouponAction(
  id: string,
  patch: Parameters<typeof updateCoupon>[2]
) {
  try {
    const actor = await requireAdminPermission("coupons.write");
    const res = await updateCoupon(actor, id, patch);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/coupons");
    revalidatePath(`/admin/coupons/${id}`);
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminDeactivateCouponAction(id: string) {
  try {
    const actor = await requireAdminPermission("coupons.write");
    await deactivateCoupon(actor, id);
    revalidatePath("/admin/coupons");
    revalidatePath(`/admin/coupons/${id}`);
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminDeleteCouponAction(id: string) {
  try {
    const actor = await requireAdminPermission("coupons.delete");
    await deleteCoupon(actor, id);
    revalidatePath("/admin/coupons");
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminAssignCouponAction(couponId: string, targets: string[]) {
  try {
    const actor = await requireAdminPermission("coupons.assign");
    const res = await assignCouponToUsers(actor, couponId, targets);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath(`/admin/coupons/${couponId}`);
    revalidatePath("/coupons");
    return { success: true as const, created: res.created, skipped: res.skipped };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminSearchCouponUsersAction(q: string) {
  try {
    await requireAdminPermission("coupons.assign");
    return { ok: true as const, users: await searchUsersForCoupon(q) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e), users: [] };
  }
}

export async function adminExportCouponsCsvAction(query: CouponListQuery) {
  try {
    await requireAdminPermission("coupons");
    return { ok: true as const, csv: await exportCouponsCsv(query) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMyCouponsAction() {
  const user = await requireAuth({ writeKind: "notification" });
  return getMyCoupons(user.id);
}

export type { CouponBenefitType, CouponAudience, CreateCouponInput };
