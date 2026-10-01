"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { chatMessageInclude } from "@/lib/chat-message-serialize";
import { hydrateUserOAuthProfile } from "@/lib/oauth-vault";

export async function getChatReportEvidence(reportId: string) {
  await requireAdmin({ action: "VIEW_CHAT_REPORT_EVIDENCE", targetId: reportId });

  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          signupIp: true,
          signupIpAt: true,
        },
      },
      reportedUser: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          signupIp: true,
          signupIpAt: true,
        },
      },
      chatRoom: {
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!report || report.targetType !== "CHAT_ROOM" || !report.chatRoomId) {
    return { error: "채팅 신고 기록을 찾을 수 없습니다." as const };
  }

  const roomId = report.chatRoomId;
  const messages = await db.message.findMany({
    where: { roomId },
    orderBy: { createdAt: "asc" },
    include: chatMessageInclude,
  });

  let productTitle: string | null = null;
  if (report.productId) {
    const listing = await db.usedListing.findUnique({
      where: { id: report.productId },
      select: { title: true },
    });
    productTitle = listing?.title ?? null;
  }

  const [reporterHydrated, reportedHydrated] = await Promise.all([
    report.reporter ? hydrateUserOAuthProfile(report.reporter) : null,
    report.reportedUser ? hydrateUserOAuthProfile(report.reportedUser) : null,
  ]);

  return {
    report: {
      id: report.id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      reporterIp: report.reporterIp,
      reportedUserIp: report.reportedUserIp,
      productId: report.productId,
      productTitle,
    },
    reporter: report.reporter
      ? {
          id: report.reporter.id,
          username: report.reporter.username,
          name: report.reporter.name,
          email: reporterHydrated?.email ?? report.reporter.email,
          signupIp: report.reporter.signupIp,
          signupIpAt: report.reporter.signupIpAt?.toISOString() ?? null,
        }
      : null,
    reportedUser: report.reportedUser
      ? {
          id: report.reportedUser.id,
          username: report.reportedUser.username,
          name: report.reportedUser.name,
          email: reportedHydrated?.email ?? report.reportedUser.email,
          signupIp: report.reportedUser.signupIp,
          signupIpAt: report.reportedUser.signupIpAt?.toISOString() ?? null,
        }
      : null,
    room: report.chatRoom,
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      isSystemMessage: m.isSystemMessage,
      createdAt: m.createdAt.toISOString(),
      sender: {
        id: m.sender.id,
        username: m.sender.username,
      },
    })),
  };
}
