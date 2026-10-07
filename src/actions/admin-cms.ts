"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";
import {
  requireAdminPermission,
  requireAdminStepUp,
  AdminAccessError,
} from "@/lib/admin/access";
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
import {
  buildBirthDateHistoryCsv,
  getBirthDateAdminRecord,
  searchBirthDateUsers,
} from "@/lib/admin/services/birth-date-history";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) {
    if (e.message === "ADMIN_STEPUP_REQUIRED") {
      return "ADMIN_STEPUP_REQUIRED";
    }
    return e.message === "UNAUTHORIZED" ? "common.error.authRequired" : "actions.st3onev";
  }
  return e instanceof Error ? e.message : "actions.s1su4v2o";
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
    if (!data) return { ok: false as const, error: "actions.svypth4" };
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
    const actor = await requireAdminStepUp("users.write");
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

export async function adminLoadBirthDateHistory(input: { q?: string; userId?: string }) {
  try {
    const q = input.q?.trim() ?? "";
    const userId = input.userId?.trim() || undefined;
    const actor = await requireAdminPermission(
      "users.birthDate",
      q || userId
        ? {
            action: "VIEW_USER_PII",
            targetType: userId ? "user" : "birth_date_history",
            targetId: userId,
            metadata: { scope: "birth_date_history", q: q || null },
          }
        : undefined
    );
    const [matches, record] = await Promise.all([
      q ? searchBirthDateUsers(q) : Promise.resolve([]),
      userId ? getBirthDateAdminRecord(userId) : Promise.resolve(null),
    ]);
    if (userId && record) {
      const { logBirthDateAdminView } = await import("@/lib/admin/services/birth-date-history");
      await logBirthDateAdminView(userId, actor.id);
    }
    return { ok: true as const, data: { matches, record } };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminExportBirthDateHistoryCsvAction(userId: string) {
  try {
    await requireAdminPermission("users.birthDate", {
      action: "EXPORT_USER_DATA",
      targetType: "user",
      targetId: userId,
      metadata: { scope: "birth_date_history", format: "csv" },
    });
    const record = await getBirthDateAdminRecord(userId);
    if (!record) return { ok: false as const, error: "actions.svypth4" };
    const safeName = record.user.username.replace(/[^a-zA-Z0-9_-]/g, "") || "user";
    return {
      ok: true as const,
      csv: buildBirthDateHistoryCsv(record),
      filename: `birth-date-${safeName}.csv`,
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminChangeBirthDateAction(input: {
  userId: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  reason: string;
}) {
  try {
    const actor = await requireAdminStepUp("users.birthDate");
    const reason = input.reason.trim();
    if (!reason) return { ok: false as const, error: "A reason is required." };
    const { parseBirthDateInput, toStoredBirthDate } = await import("@/lib/birth-date");
    const birth = parseBirthDateInput(input.birthYear, input.birthMonth, input.birthDay);
    if (!birth) return { ok: false as const, error: "Enter a valid birth date." };
    const stored = toStoredBirthDate(birth);
    const { db } = await import("@/lib/db");
    const { recordBirthDateChange } = await import("@/lib/birth-date-change-log");
    const prior = await db.user.findUnique({
      where: { id: input.userId },
      select: { birthDate: true },
    });
    if (!prior) return { ok: false as const, error: "actions.svypth4" };
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: input.userId },
        data: { birthDate: stored, birthDateSource: "ADMIN" },
      });
      await recordBirthDateChange(tx, {
        userId: input.userId,
        previousValue: prior.birthDate,
        newValue: stored,
        source: "ADMIN",
        actorId: actor.id,
        changedBy: actor.id,
        reason,
      });
    });
    revalidatePath("/admin/birth-dates");
    revalidatePath(`/admin/users/${input.userId}`);
    return { ok: true as const };
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
    const actor = await requireAdminStepUp("admins");
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
    const actor = await requireAdminStepUp("admins");
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
    const actor = await requireAdminStepUp("admins");
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
    const actor = await requireAdminStepUp("settings");
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
