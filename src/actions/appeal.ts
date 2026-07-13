"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AppealStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { auth, requireAuth } from "@/lib/auth";
import { isReadOnlySuspended, isServiceBanned, OPEN_APPEAL_STATUSES } from "@/lib/account-status";
import { createNotification } from "@/lib/notifications";

const appealSchema = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(50).max(5000),
  contactEmail: z.string().email(),
  allowFollowUpEmail: z.boolean(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        mimeType: z.string(),
        sizeBytes: z.number().int().positive(),
      })
    )
    .max(10)
    .optional(),
});

export async function getAppealContext() {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." as const };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      createdAt: true,
      accountStatus: true,
      suspensionReason: true,
      suspendedAt: true,
      isBanned: true,
    },
  });
  if (!user) return { error: "사용자를 찾을 수 없습니다." as const };
  if (!isReadOnlySuspended(user.accountStatus) && !isServiceBanned(user)) {
    return { error: "현재 제재 상태가 아닙니다." as const };
  }

  const openAppeal = await db.accountAppeal.findFirst({
    where: {
      userId: user.id,
      status: { in: [...OPEN_APPEAL_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    include: { attachments: true },
  });

  return { user, openAppeal };
}

export async function submitAccountAppeal(data: z.infer<typeof appealSchema>) {
  const user = await requireAuth({ writeKind: "appeal" });
  const parsed = appealSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해 주세요." };

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { accountStatus: true, suspensionReason: true, isBanned: true },
  });
  if (!dbUser) return { error: "사용자를 찾을 수 없습니다." };
  if (!isReadOnlySuspended(dbUser.accountStatus) && !isServiceBanned(dbUser)) {
    return { error: "현재 제재 상태가 아닙니다." };
  }

  const existing = await db.accountAppeal.findFirst({
    where: {
      userId: user.id,
      status: { in: [...OPEN_APPEAL_STATUSES] },
    },
  });
  if (existing) return { error: "이미 검토 중인 이의 제기가 있습니다." };

  const appeal = await db.accountAppeal.create({
    data: {
      userId: user.id,
      accountStatusAtSubmit: dbUser.accountStatus,
      suspensionReasonSnapshot: dbUser.suspensionReason,
      title: parsed.data.title,
      content: parsed.data.content,
      contactEmail: parsed.data.contactEmail,
      allowFollowUpEmail: parsed.data.allowFollowUpEmail,
      attachments: parsed.data.attachments?.length
        ? {
            create: parsed.data.attachments.map((a) => ({
              url: a.url,
              filename: a.filename,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
            })),
          }
        : undefined,
    },
  });

  await createNotification({
    userId: user.id,
    type: "SYSTEM",
    title: "이의 제기 접수",
    body: "이의 제기가 정상적으로 접수되었습니다.",
    link: `/appeal/${appeal.id}`,
  });

  revalidatePath("/appeal");
  revalidatePath("/appeal/history");
  return { success: true, appealId: appeal.id };
}

export async function getMyAppeals() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db.accountAppeal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      decisionNote: true,
      decidedAt: true,
    },
  });
}

export async function getAppealDetail(appealId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.accountAppeal.findFirst({
    where: { id: appealId, userId: session.user.id },
    include: {
      attachments: true,
      responses: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getAdminAppeals(status?: AppealStatus) {
  const { requireAdmin } = await import("@/lib/auth");
  await requireAdmin();

  return db.accountAppeal.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      user: { select: { id: true, username: true, email: true, accountStatus: true } },
      attachments: true,
    },
  });
}

export async function updateAppealStatus(
  appealId: string,
  status: AppealStatus,
  note?: string
) {
  const { requireAdmin } = await import("@/lib/auth");
  const admin = await requireAdmin();

  const appeal = await db.accountAppeal.update({
    where: { id: appealId },
    data: {
      status,
      adminId: admin.id,
      adminNotes: note,
      decisionNote: status === "APPROVED" || status === "REJECTED" ? note : undefined,
      decidedAt: status === "APPROVED" || status === "REJECTED" ? new Date() : undefined,
      infoRequestedAt: status === "INFO_REQUESTED" ? new Date() : undefined,
      infoDueAt:
        status === "INFO_REQUESTED"
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : undefined,
    },
    include: { user: { select: { id: true } } },
  });

  if (status === "APPROVED") {
    const { restoreUserAccount } = await import("@/actions/admin");
    await restoreUserAccount(appeal.userId, note ?? "이의 제기 승인");
  }

  const messages: Partial<Record<AppealStatus, string>> = {
    RECEIVED: "이의 제기가 정상적으로 접수되었습니다.",
    UNDER_REVIEW: "담당자가 이의 제기를 검토하고 있습니다.",
    INFO_REQUESTED: "추가 자료가 필요합니다.",
    APPROVED: "이의 제기가 승인되었습니다.",
    REJECTED: "이의 제기가 기각되었습니다.",
  };
  const body = messages[status];
  if (body) {
    await createNotification({
      userId: appeal.userId,
      type: "SYSTEM",
      title: "이의 제기 안내",
      body,
      link: `/appeal/${appeal.id}`,
    });
  }

  revalidatePath("/admin/suspensions");
  revalidatePath("/appeal");
  return { success: true };
}

export async function getBanEvasionSuspects() {
  const { requireAdmin } = await import("@/lib/auth");
  await requireAdmin();

  return db.banEvasionSuspect.findMany({
    where: { reviewed: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, username: true, email: true, createdAt: true } },
      linkedUser: {
        select: {
          id: true,
          username: true,
          accountStatus: true,
          suspensionReason: true,
        },
      },
    },
  });
}

export async function getUserSuspensionDetail(userId: string) {
  const { requireAdmin } = await import("@/lib/auth");
  await requireAdmin();

  const [user, logs, appeals, evasion] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        accountStatus: true,
        suspensionReason: true,
        suspendedAt: true,
        suspendedById: true,
        suspensionExpiresAt: true,
        isBanned: true,
        banReason: true,
      },
    }),
    db.accountSuspensionLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { actor: { select: { username: true } } },
    }),
    db.accountAppeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.banEvasionSuspect.findMany({
      where: { OR: [{ userId }, { linkedUserId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { user, logs, appeals, evasion };
}
