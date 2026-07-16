"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";
import { requireAdminPermission, AdminAccessError } from "@/lib/admin/access";
import { getAdminDashboardData } from "@/lib/admin/services/dashboard";
import {
  adminAddUserMemo,
  adminChangeUsername,
  adminGrantPremium,
  adminRestoreUser,
  adminSoftDeleteUser,
  adminSuspendUser,
  demoteStaff,
  exportUsersCsv,
  getAdminUserDetail,
  listAdminStaff,
  listAdminUsers,
  promoteUserToStaff,
  resetStaffPassword,
  setStaffDisabled,
  setStaffRole,
  type UserListQuery,
} from "@/lib/admin/services/users";
import {
  getSiteSettings,
  listAuditLogs,
  updateSiteSettings,
  type SiteSettingsShape,
} from "@/lib/admin/services/settings";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) return e.message === "UNAUTHORIZED" ? "로그인이 필요합니다." : "권한이 없습니다.";
  return e instanceof Error ? e.message : "오류가 발생했습니다.";
}

export async function adminLoadDashboard() {
  try {
    await requireAdminPermission("dashboard", { action: "DASHBOARD_VIEW" });
    return { ok: true as const, data: await getAdminDashboardData() };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminLoadUsers(query: UserListQuery) {
  try {
    await requireAdminPermission("users", { action: "VIEW_USER_PII", metadata: { query } });
    return { ok: true as const, data: await listAdminUsers(query) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminLoadUserDetail(userId: string) {
  try {
    await requireAdminPermission("users", {
      action: "VIEW_USER_PII",
      targetType: "user",
      targetId: userId,
    });
    const data = await getAdminUserDetail(userId);
    if (!data) return { ok: false as const, error: "사용자를 찾을 수 없습니다." };
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminUserSuspendAction(input: {
  userId: string;
  reason: string;
  mode: "permanent" | "temporary";
  untilIso?: string;
}) {
  try {
    const actor = await requireAdminPermission("users.write");
    const res = await adminSuspendUser(
      actor,
      input.userId,
      input.reason,
      input.mode,
      input.untilIso ? new Date(input.untilIso) : undefined
    );
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${input.userId}`);
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminUserRestoreAction(userId: string, reason?: string) {
  try {
    const actor = await requireAdminPermission("users.write");
    const res = await adminRestoreUser(actor, userId, reason);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminUserSoftDeleteAction(userId: string, reason: string) {
  try {
    const actor = await requireAdminPermission("users.write");
    const res = await adminSoftDeleteUser(actor, userId, reason);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminUserGrantPremiumAction(userId: string, days: number) {
  try {
    const actor = await requireAdminPermission("users.write");
    const res = await adminGrantPremium(actor, userId, days);
    revalidatePath(`/admin/users/${userId}`);
    return { success: true as const, premiumUntil: res.premiumUntil };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminUserChangeUsernameAction(userId: string, username: string) {
  try {
    const actor = await requireAdminPermission("users.write");
    const res = await adminChangeUsername(actor, userId, username);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true as const, username: "username" in res ? res.username : username };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminUserAddMemoAction(userId: string, body: string) {
  try {
    const actor = await requireAdminPermission("users.write");
    const res = await adminAddUserMemo(actor, userId, body);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath(`/admin/users/${userId}`);
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminExportUsersCsvAction(query: UserListQuery) {
  try {
    await requireAdminPermission("users", { action: "EXPORT_USER_DATA" });
    const csv = await exportUsersCsv(query);
    return { ok: true as const, csv };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminLoadStaff() {
  try {
    await requireAdminPermission("admins");
    return { ok: true as const, data: await listAdminStaff() };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminPromoteStaffAction(usernameOrId: string, role: UserRole) {
  try {
    const actor = await requireAdminPermission("admins");
    const res = await promoteUserToStaff(actor, usernameOrId, role);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/roles");
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminSetStaffRoleAction(userId: string, role: UserRole) {
  try {
    const actor = await requireAdminPermission("admins");
    const res = await setStaffRole(actor, userId, role);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/roles");
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminToggleStaffAction(userId: string, disabled: boolean) {
  try {
    const actor = await requireAdminPermission("admins");
    const res = await setStaffDisabled(actor, userId, disabled);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/roles");
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminResetStaffPasswordAction(userId: string) {
  try {
    const actor = await requireAdminPermission("admins");
    const res = await resetStaffPassword(actor, userId);
    revalidatePath("/admin/roles");
    return { success: true as const, temporaryPassword: res.temporaryPassword };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminDemoteStaffAction(userId: string) {
  try {
    const actor = await requireAdminPermission("admins");
    const res = await demoteStaff(actor, userId);
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/admin/roles");
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminLoadSettings() {
  try {
    await requireAdminPermission("settings");
    return { ok: true as const, data: await getSiteSettings() };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminSaveSettingsAction(patch: Partial<SiteSettingsShape>) {
  try {
    const actor = await requireAdminPermission("settings");
    const data = await updateSiteSettings(actor, patch);
    revalidatePath("/admin/settings");
    return { success: true as const, data };
  } catch (e) {
    return { error: errMsg(e) };
  }
}

export async function adminLoadAudit(query: {
  q?: string;
  action?: string;
  page?: number;
}) {
  try {
    await requireAdminPermission("audit", { action: "AUDIT_VIEW" });
    return { ok: true as const, data: await listAuditLogs(query) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
