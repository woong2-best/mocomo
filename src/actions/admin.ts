"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ReportStatus } from "@prisma/client";

export async function banUser(targetId: string, reason: string, until?: Date) {
  const admin = await requireAdmin();
  await db.user.update({
    where: { id: targetId },
    data: { isBanned: true, banReason: reason, bannedUntil: until },
  });
  await db.modLog.create({
    data: { actorId: admin.id, targetId, action: "ban", reason },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function unbanUser(targetId: string) {
  const admin = await requireAdmin();
  await db.user.update({
    where: { id: targetId },
    data: { isBanned: false, banReason: null, bannedUntil: null },
  });
  await db.modLog.create({
    data: { actorId: admin.id, targetId, action: "unban" },
  });
  return { success: true };
}

export async function resolveReport(reportId: string, status: ReportStatus) {
  const admin = await requireAdmin();
  await db.report.update({ where: { id: reportId }, data: { status } });
  await db.modLog.create({
    data: { actorId: admin.id, targetId: reportId, action: "resolve_report", metadata: { status } },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function getAdminStats() {
  await requireAdmin();
  const [users, posts, reports, tips] = await Promise.all([
    db.user.count(),
    db.post.count(),
    db.report.count({ where: { status: "PENDING" } }),
    db.tip.aggregate({ _sum: { amount: true } }),
  ]);
  return {
    users,
    posts,
    pendingReports: reports,
    totalTips: tips._sum.amount ?? 0,
  };
}

export async function getPendingReports() {
  await requireAdmin();
  return db.report.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { reporter: { select: { username: true } } },
  });
}
