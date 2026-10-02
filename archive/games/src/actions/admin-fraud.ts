"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  adminFreezeUser,
  adminIgnoreFraudUser as ignoreFraudUserService,
  adminUnfreezeUser,
  getFraudDashboardStats,
  getFraudUserDetail,
  initFraudAdmin,
  listFraudProfiles,
  recalculateUserFraudRisk,
  scanActiveUsersForFraud,
} from "@/lib/apt/economy/fraud/admin-fraud-service";

const PATH = "/admin/economy/fraud";

function revalidate() {
  revalidatePath(PATH);
}

export async function getFraudAdminPageData() {
  await requireAdmin();
  await initFraudAdmin();
  const [stats, profiles] = await Promise.all([
    getFraudDashboardStats(),
    listFraudProfiles(80),
  ]);
  return { stats, profiles };
}

export async function getFraudUserDetailAction(userId: string) {
  await requireAdmin();
  return getFraudUserDetail(userId);
}

export async function adminRecalculateFraudUser(userId: string) {
  await requireAdmin();
  const res = await recalculateUserFraudRisk(userId);
  revalidate();
  return res;
}

export async function adminScanFraudActiveUsers() {
  await requireAdmin();
  const count = await scanActiveUsersForFraud(150);
  revalidate();
  return { count };
}

export async function adminFreezeFraudUser(userId: string, reason: string) {
  const admin = await requireAdmin();
  await adminFreezeUser(userId, admin.id, reason);
  revalidate();
  return { ok: true as const };
}

export async function adminUnfreezeFraudUser(userId: string, reason: string) {
  const admin = await requireAdmin();
  await adminUnfreezeUser(userId, admin.id, reason);
  revalidate();
  return { ok: true as const };
}

export async function adminIgnoreFraudUser(
  userId: string,
  days: number,
  reason: string
) {
  const admin = await requireAdmin();
  await ignoreFraudUserService(userId, admin.id, days, reason);
  revalidate();
  return { ok: true as const };
}
