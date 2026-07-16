"use server";

import { revalidatePath } from "next/cache";
import type { SettlementStatus } from "@prisma/client";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import {
  createSettlementDraft,
  getSettlementDetail,
  listSettlements,
  transitionSettlement,
  type SettlementLineInput,
} from "@/lib/admin/services/settlements";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) {
    return e.status === 401 ? "로그인이 필요합니다." : "권한이 없습니다.";
  }
  return e instanceof Error ? e.message : "오류가 발생했습니다.";
}

export async function adminListSettlementsAction(query: {
  status?: SettlementStatus;
  userId?: string;
  page?: number;
}) {
  try {
    await requireAdminPermission("settlements");
    return { ok: true as const, data: await listSettlements(query) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminGetSettlementAction(id: string) {
  try {
    await requireAdminPermission("settlements");
    const data = await getSettlementDetail(id);
    if (!data) return { ok: false as const, error: "정산을 찾을 수 없습니다." };
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminCreateSettlementAction(input: {
  userId: string;
  title?: string;
  grossAmountKrw: number;
  lines?: SettlementLineInput[];
  periodStart?: string;
  periodEnd?: string;
}) {
  try {
    const actor = await requireAdminPermission("settlements");
    const res = await createSettlementDraft({
      ...input,
      periodStart: input.periodStart ? new Date(input.periodStart) : undefined,
      periodEnd: input.periodEnd ? new Date(input.periodEnd) : undefined,
      actorId: actor.id,
    });
    revalidatePath("/admin/settlements");
    return { success: true as const, id: res.settlement.id, preview: res.preview };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminTransitionSettlementAction(
  id: string,
  toStatus: SettlementStatus,
  note?: string
) {
  try {
    const actor = await requireAdminPermission("settlements");
    const res = await transitionSettlement(actor, id, toStatus, note);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/settlements");
    revalidatePath(`/admin/settlements/${id}`);
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}
