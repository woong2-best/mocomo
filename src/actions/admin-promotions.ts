"use server";

import { revalidatePath } from "next/cache";
import type { CouponBenefitType, PromotionTrigger } from "@prisma/client";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import {
  assignPromotion,
  createPromotion,
  deletePromotion,
  getMyPromotions,
  getPromotionDetail,
  getPromotionStatistics,
  listPromotionHistory,
  listPromotions,
  previewUserSettlementBenefits,
  updatePromotion,
  type CreatePromotionInput,
} from "@/lib/admin/services/promotions";
import { requireAuth } from "@/lib/auth";
import type { PromotionRule } from "@/lib/promotion/rules";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) {
    return e.status === 401 ? "로그인이 필요합니다." : "권한이 없습니다.";
  }
  return e instanceof Error ? e.message : "오류가 발생했습니다.";
}

export async function adminListPromotionsAction(query: {
  q?: string;
  page?: number;
  active?: boolean;
}) {
  try {
    await requireAdminPermission("coupons");
    return { ok: true as const, data: await listPromotions(query) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminGetPromotionAction(id: string) {
  try {
    await requireAdminPermission("coupons");
    const data = await getPromotionDetail(id);
    if (!data) return { ok: false as const, error: "프로모션을 찾을 수 없습니다." };
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminCreatePromotionAction(input: CreatePromotionInput) {
  try {
    const actor = await requireAdminPermission("coupons.write");
    const res = await createPromotion(actor, input);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/promotions");
    revalidatePath("/admin/coupons");
    return { success: true as const, id: res.promotion!.id };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminUpdatePromotionAction(
  id: string,
  patch: {
    name?: string;
    active?: boolean;
    priority?: number;
    endsAt?: string | null;
    adminMemo?: string | null;
    rules?: PromotionRule[];
    description?: string | null;
  }
) {
  try {
    const actor = await requireAdminPermission("coupons.write");
    await updatePromotion(actor, id, patch);
    revalidatePath("/admin/promotions");
    revalidatePath(`/admin/promotions/${id}`);
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminDeletePromotionAction(id: string) {
  try {
    const actor = await requireAdminPermission("coupons.delete");
    await deletePromotion(actor, id);
    revalidatePath("/admin/promotions");
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminAssignPromotionAction(promotionId: string, targets: string[]) {
  try {
    const actor = await requireAdminPermission("coupons.assign");
    const { db } = await import("@/lib/db");
    const ids: string[] = [];
    for (const t of targets) {
      const term = t.trim().replace(/^@/, "");
      if (!term) continue;
      const u = await db.user.findFirst({
        where: {
          deletedAt: null,
          OR: [{ id: term }, { username: { equals: term, mode: "insensitive" } }],
        },
        select: { id: true },
      });
      if (u) ids.push(u.id);
    }
    if (ids.length === 0) return { error: "지급 대상 유저를 찾을 수 없습니다." };
    const res = await assignPromotion(actor, promotionId, ids, {
      skipRules: true,
      notify: true,
    });
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath(`/admin/promotions/${promotionId}`);
    revalidatePath("/coupons");
    return { success: true as const, created: res.created, skipped: res.skipped };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminPromotionStatsAction(promotionId?: string) {
  try {
    await requireAdminPermission("coupons");
    return { ok: true as const, data: await getPromotionStatistics(promotionId) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminPromotionHistoryAction(promotionId?: string, page?: number) {
  try {
    await requireAdminPermission("coupons");
    return { ok: true as const, data: await listPromotionHistory(promotionId, page) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function previewSettlementBenefitsAction(grossAmountKrw: number) {
  try {
    const user = await requireAuth();
    const data = await previewUserSettlementBenefits(user.id, grossAmountKrw);
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminPreviewSettlementBenefitsAction(
  userId: string,
  grossAmountKrw: number
) {
  try {
    await requireAdminPermission("settlements");
    const data = await previewUserSettlementBenefits(userId, grossAmountKrw);
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMyPromotionsAction() {
  const user = await requireAuth();
  return getMyPromotions(user.id);
}

export type { CouponBenefitType, PromotionTrigger, CreatePromotionInput };
