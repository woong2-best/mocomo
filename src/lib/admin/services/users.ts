import type { Prisma, UserRole, PremiumTier, AccountStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import type { AdminActor } from "@/lib/admin/access";
import { isSiteOperatorAccount } from "@/lib/operator-config";
import { isAdminCmsRole } from "@/lib/admin/permissions";

const PAGE_SIZE = 20;

export type UserListQuery = {
  q?: string;
  page?: number;
  sort?: "createdAt" | "lastLoginAt" | "username";
  order?: "asc" | "desc";
  status?: "all" | "active" | "suspended" | "deleted" | "premium";
};

export async function listAdminUsers(query: UserListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const sort = query.sort ?? "createdAt";
  const order = query.order ?? "desc";
  const q = query.q?.trim();

  const where: Prisma.UserWhereInput = {};

  if (query.status === "deleted") {
    where.deletedAt = { not: null };
  } else if (query.status === "active") {
    where.deletedAt = null;
    where.accountStatus = "ACTIVE";
    where.isBanned = false;
  } else if (query.status === "suspended") {
    where.OR = [
      { isBanned: true },
      { accountStatus: { in: ["TEMP_SUSPENDED", "PERMANENT_SUSPENDED", "BANNED", "READ_ONLY", "LIMITED"] } },
    ];
  } else if (query.status === "premium") {
    where.deletedAt = null;
    where.OR = [{ premiumTier: "PREMIUM" }, { premiumUntil: { gt: new Date() } }];
  }

  if (q) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { id: q },
        ],
      },
    ];
  }

  const [total, items] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        image: true,
        role: true,
        premiumTier: true,
        premiumUntil: true,
        accountStatus: true,
        isBanned: true,
        deletedAt: true,
        createdAt: true,
        lastLoginAt: true,
        totalSupportSent: true,
        totalSupportReceived: true,
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getAdminUserDetail(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      wallet: true,
      adminMemosAbout: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { author: { select: { username: true } } },
      },
      usernameChangeLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      suspensionLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) return null;

  const [tipsSent, tipsReceived, payments, reportsAbout, postsCount, ordersBought, ordersSold] =
    await Promise.all([
      db.tip.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { receiver: { select: { username: true } } },
      }),
      db.tip.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { sender: { select: { username: true } } },
      }),
      db.paymentIntent.findMany({
        where: { userId, status: "PAID" },
        orderBy: { paidAt: "desc" },
        take: 20,
      }),
      db.report.findMany({
        where: { reportedUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { reporter: { select: { username: true } } },
      }),
      db.post.count({ where: { authorId: userId } }),
      db.marketplaceOrder.count({ where: { buyerId: userId } }).catch(() => 0),
      db.marketplaceOrder.count({ where: { sellerId: userId } }).catch(() => 0),
    ]);

  return {
    user,
    tipsSent,
    tipsReceived,
    payments,
    reportsAbout,
    postsCount,
    ordersBought,
    ordersSold,
  };
}

export async function adminSuspendUser(
  actor: AdminActor,
  userId: string,
  reason: string,
  mode: "permanent" | "temporary",
  until?: Date
) {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };
  if (target.id === actor.id) return { error: "본인 계정은 정지할 수 없습니다." };

  const status = mode === "permanent" ? "PERMANENT_SUSPENDED" : "TEMP_SUSPENDED";
  await db.user.update({
    where: { id: userId },
    data: {
      accountStatus: status as AccountStatus,
      isBanned: false,
      suspensionReason: reason,
      suspendedAt: new Date(),
      suspendedById: actor.id,
      suspensionExpiresAt: mode === "temporary" ? until ?? null : null,
    },
  });

  await db.accountSuspensionLog.create({
    data: {
      userId,
      actorId: actor.id,
      previousStatus: target.accountStatus,
      newStatus: status,
      reason,
      isPermanent: mode === "permanent",
    },
  });

  await logSiteAdminAudit({
    actorId: actor.id,
    action: "USER_SUSPEND",
    targetType: "user",
    targetId: userId,
    metadata: { mode, reason },
  });

  return { success: true as const };
}

export async function adminRestoreUser(actor: AdminActor, userId: string, reason?: string) {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  await db.user.update({
    where: { id: userId },
    data: {
      accountStatus: "ACTIVE",
      isBanned: false,
      banReason: null,
      bannedUntil: null,
      suspensionReason: null,
      suspendedAt: null,
      suspendedById: null,
      suspensionExpiresAt: null,
      deletedAt: null,
      scheduledPurgeAt: null,
    },
  });

  await logSiteAdminAudit({
    actorId: actor.id,
    action: "USER_RESTORE",
    targetType: "user",
    targetId: userId,
    metadata: { reason },
  });

  return { success: true as const };
}

export async function adminSoftDeleteUser(actor: AdminActor, userId: string, reason: string) {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };
  if (target.id === actor.id) return { error: "본인 계정은 삭제할 수 없습니다." };

  const purge = new Date();
  purge.setDate(purge.getDate() + 50);

  await db.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      scheduledPurgeAt: purge,
      deletionReason: reason,
      accountStatus: "ACTIVE",
    },
  });

  await logSiteAdminAudit({
    actorId: actor.id,
    action: "USER_SOFT_DELETE",
    targetType: "user",
    targetId: userId,
    metadata: { reason },
  });

  return { success: true as const };
}

export async function adminGrantPremium(
  actor: AdminActor,
  userId: string,
  days: number
) {
  const until = new Date();
  until.setDate(until.getDate() + Math.max(1, days));

  await db.user.update({
    where: { id: userId },
    data: {
      premiumTier: "PREMIUM" as PremiumTier,
      premiumUntil: until,
    },
  });

  await logSiteAdminAudit({
    actorId: actor.id,
    action: "USER_PREMIUM_GRANT",
    targetType: "user",
    targetId: userId,
    metadata: { days, until: until.toISOString() },
  });

  return { success: true as const, premiumUntil: until };
}

export async function adminChangeUsername(
  actor: AdminActor,
  userId: string,
  newUsername: string
) {
  const cleaned = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (cleaned.length < 3 || cleaned.length > 24) {
    return { error: "유저네임은 3–24자 (영문/숫자/_ )여야 합니다." };
  }
  const exists = await db.user.findFirst({
    where: { username: cleaned, NOT: { id: userId } },
  });
  if (exists) return { error: "이미 사용 중인 유저네임입니다." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { username: cleaned } }),
    db.usernameChangeLog.create({
      data: {
        userId,
        oldUsername: target.username,
        newUsername: cleaned,
      },
    }),
  ]);

  await logSiteAdminAudit({
    actorId: actor.id,
    action: "USER_USERNAME_CHANGE",
    targetType: "user",
    targetId: userId,
    metadata: { from: target.username, to: cleaned },
  });

  return { success: true as const, username: cleaned };
}

export async function adminAddUserMemo(actor: AdminActor, userId: string, body: string) {
  const text = body.trim();
  if (!text) return { error: "메모를 입력해 주세요." };
  const memo = await db.adminUserMemo.create({
    data: { userId, authorId: actor.id, body: text.slice(0, 4000) },
  });
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "USER_MEMO",
    targetType: "user",
    targetId: userId,
    metadata: { memoId: memo.id },
  });
  return { success: true as const, memoId: memo.id };
}

export async function exportUsersCsv(query: UserListQuery) {
  const { items } = await listAdminUsers({ ...query, page: 1 });
  // export first page bulk — fetch more for CSV
  const all = await db.user.findMany({
    where: {},
    take: 5000,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      accountStatus: true,
      premiumTier: true,
      createdAt: true,
      lastLoginAt: true,
      deletedAt: true,
    },
  });
  const header = "id,username,email,role,status,premium,createdAt,lastLoginAt,deletedAt";
  const rows = all.map((u) =>
    [
      u.id,
      u.username,
      u.email ?? "",
      u.role,
      u.accountStatus,
      u.premiumTier,
      u.createdAt.toISOString(),
      u.lastLoginAt?.toISOString() ?? "",
      u.deletedAt?.toISOString() ?? "",
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

export async function listAdminStaff() {
  return db.user.findMany({
    where: {
      role: {
        in: [
          "MARKETING",
          "CUSTOMER_SUPPORT",
          "MODERATOR",
          "SETTLEMENT_MANAGER",
          "SENIOR_MODERATOR",
          "ADMIN",
          "SUPER_ADMIN",
          "OWNER",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      adminDisabledAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function setStaffRole(
  actor: AdminActor,
  userId: string,
  role: UserRole
) {
  if (actor.role !== "OWNER") {
    return { error: "OWNER만 관리자 권한을 변경할 수 있습니다." };
  }
  if (role === "OWNER") {
    return { error: "OWNER 역할은 부여할 수 없습니다." };
  }
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };
  if (isSiteOperatorAccount(target)) {
    return { error: "사이트 오너 계정 권한은 변경할 수 없습니다." };
  }

  await db.user.update({ where: { id: userId }, data: { role } });
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "ADMIN_ROLE_CHANGE",
    targetType: "user",
    targetId: userId,
    metadata: { from: target.role, to: role },
  });
  return { success: true as const };
}

export async function setStaffDisabled(actor: AdminActor, userId: string, disabled: boolean) {
  if (actor.role !== "OWNER") {
    return { error: "OWNER만 관리자를 활성화/비활성화할 수 있습니다." };
  }
  if (userId === actor.id) return { error: "본인 계정은 비활성화할 수 없습니다." };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };
  if (isSiteOperatorAccount(target)) {
    return { error: "사이트 오너 계정은 비활성화할 수 없습니다." };
  }
  await db.user.update({
    where: { id: userId },
    data: { adminDisabledAt: disabled ? new Date() : null },
  });
  await logSiteAdminAudit({
    actorId: actor.id,
    action: disabled ? "ADMIN_DISABLE" : "ADMIN_ENABLE",
    targetType: "user",
    targetId: userId,
  });
  return { success: true as const };
}

export async function resetStaffPassword(actor: AdminActor, userId: string) {
  if (actor.role !== "OWNER") {
    return { error: "OWNER만 관리자 비밀번호를 초기화할 수 있습니다." };
  }
  const temp = `Mc${Math.random().toString(36).slice(2, 10)}!A1`;
  const passwordHash = await bcrypt.hash(temp, 12);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "ADMIN_PASSWORD_RESET",
    targetType: "user",
    targetId: userId,
  });
  return { success: true as const, temporaryPassword: temp };
}

export async function promoteUserToStaff(
  actor: AdminActor,
  usernameOrId: string,
  role: UserRole
) {
  if (actor.role !== "OWNER") {
    return { error: "OWNER만 관리자 계정을 추가할 수 있습니다." };
  }
  const user =
    (await db.user.findUnique({ where: { id: usernameOrId } })) ??
    (await db.user.findFirst({
      where: { username: { equals: usernameOrId.replace(/^@/, ""), mode: "insensitive" } },
    }));
  if (!user) return { error: "사용자를 찾을 수 없습니다." };
  if (role === "OWNER") return { error: "OWNER는 생성할 수 없습니다." };
  if (isSiteOperatorAccount(user)) {
    return { error: "사이트 오너 계정은 이미 최고 권한입니다." };
  }
  if (!isAdminCmsRole(role)) {
    return { error: "유효하지 않은 관리자 역할입니다." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { role, adminDisabledAt: null },
  });
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "ADMIN_CREATE",
    targetType: "user",
    targetId: user.id,
    metadata: { role },
  });
  return { success: true as const, userId: user.id };
}

export async function demoteStaff(actor: AdminActor, userId: string) {
  if (actor.role !== "OWNER") {
    return { error: "OWNER만 관리자 권한을 삭제할 수 있습니다." };
  }
  if (userId === actor.id) return { error: "본인 권한은 제거할 수 없습니다." };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };
  if (isSiteOperatorAccount(target) || target.role === "OWNER") {
    return { error: "사이트 오너 계정은 삭제할 수 없습니다." };
  }

  // 관리자 역할 제거 → 일반 유저 (더 이상 /admin 진입 불가)
  await db.user.update({
    where: { id: userId },
    data: { role: "USER", adminDisabledAt: null },
  });
  await logSiteAdminAudit({
    actorId: actor.id,
    action: "ADMIN_DELETE",
    targetType: "user",
    targetId: userId,
    metadata: { from: target.role, to: "USER" },
  });
  return { success: true as const };
}
