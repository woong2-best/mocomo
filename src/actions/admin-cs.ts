"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  addCsMemo,
  csFreezeUser,
  csGrantItem,
  csReplayIapPurchase,
  csRefundGold,
  csUnfreezeUser,
  csWarnUser,
  exportCsTimelineJson,
  exportCsAuditJson,
  exportCsTimelineCsv,
  exportCsAuditCsv,
  getCsUserDetail,
  searchEconomyCs,
  type CsUserDetail,
} from "@/lib/apt/economy/admin-cs-service";
import type { EconomyEventCategory } from "@/lib/apt/economy/economy-event-types";

const PATH = "/admin/economy/logs";

function revalidate() {
  revalidatePath(PATH);
}

export async function adminSearchEconomyCs(query: string) {
  await requireAdmin({
    action: "SEARCH_USER_CS",
    metadata: { queryLength: query.trim().length },
  });
  return searchEconomyCs(query);
}

export async function adminGetCsUserDetail(
  userId: string,
  filters?: EconomyEventCategory[]
) {
  await requireAdmin({
    action: "VIEW_USER_PII",
    targetType: "user",
    targetId: userId,
  });
  return getCsUserDetail(userId, { categories: filters?.length ? filters : undefined });
}

export async function adminAddCsMemo(userId: string, memo: string) {
  const admin = await requireAdmin();
  const res = await addCsMemo(userId, admin.id, memo);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminCsRefundGold(userId: string, amount: number, reason: string) {
  const admin = await requireAdmin();
  const res = await csRefundGold(userId, admin.id, amount, reason);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminCsGrantItem(
  userId: string,
  itemId: string,
  quantity: number,
  reason: string
) {
  const admin = await requireAdmin();
  const res = await csGrantItem(userId, admin.id, itemId, quantity, reason);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminCsWarnUser(userId: string, reason: string) {
  const admin = await requireAdmin();
  await csWarnUser(userId, admin.id, reason);
  revalidate();
  return { ok: true as const };
}

export async function adminCsFreezeUser(userId: string, reason: string) {
  const admin = await requireAdmin();
  await csFreezeUser(userId, admin.id, reason);
  revalidate();
  return { ok: true as const };
}

export async function adminCsUnfreezeUser(userId: string, reason: string) {
  const admin = await requireAdmin();
  await csUnfreezeUser(userId, admin.id, reason);
  revalidate();
  return { ok: true as const };
}

export async function adminCsReplayIap(purchaseIdOrOrderId: string) {
  const admin = await requireAdmin();
  const res = await csReplayIapPurchase(purchaseIdOrOrderId, admin.id);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminExportCsTimeline(
  userId: string,
  format: "csv" | "json",
  filters?: EconomyEventCategory[]
) {
  await requireAdmin({
    action: "EXPORT_USER_DATA",
    targetType: "user",
    targetId: userId,
    metadata: { format },
  });
  const detail = await getCsUserDetail(userId, { categories: filters?.length ? filters : undefined });
  if (!detail) return { error: "사용자를 찾을 수 없습니다." };
  if (format === "json") {
    return {
      ok: true as const,
      data: exportCsAuditJson(detail.auditTimeline),
      filename: `audit-${detail.user.username}.json`,
    };
  }
  return {
    ok: true as const,
    data: exportCsAuditCsv(detail.auditTimeline),
    filename: `audit-${detail.user.username}.csv`,
  };
}

export type { CsUserDetail };
