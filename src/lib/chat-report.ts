import { db } from "@/lib/db";
import type { ReportReasonId } from "@/lib/report-reasons";
import { REPORT_REASONS } from "@/lib/report-reasons";
import { addRiskScore, upsertModerationCaseForReport } from "@/lib/risk-score";
import { chatReportLockMessage } from "@/lib/chat-report-copy";
import { relayChatMessageToSocket } from "@/lib/chat-socket-relay";
import { serializeChatMessageForRelay } from "@/lib/chat-message-serialize";
import { chatMessageInclude } from "@/lib/chat-message-serialize";

function riskReasonForReport(reason: ReportReasonId): string {
  switch (reason) {
    case "SPAM":
      return "SPAM_POST";
    case "HATE":
      return "HATE_SPEECH";
    case "ABUSE":
    case "HARASSMENT":
      return "PROFANITY";
    case "IMPERSONATION":
      return "IMPERSONATION";
    case "FRAUD":
    case "REGULATED":
      return "ILLEGAL_TRADE";
    case "SEXUAL":
      return "SEXUAL_CONTENT";
    case "UNDERAGE":
      return "CHILD_SAFETY";
    case "VIOLENCE":
      return "THREAT";
    case "SELF_HARM":
      return "SELF_HARM_ENCOURAGEMENT";
    default:
      return "REPORT_RECEIVED";
  }
}

async function latestUserIp(userId: string): Promise<string | null> {
  const row = await db.userAccessLog.findFirst({
    where: { userId, ip: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { ip: true },
  });
  return row?.ip?.trim() || null;
}

export type SubmitChatRoomReportInput = {
  reporterId: string;
  reporterIp: string;
  roomId: string;
  reason: ReportReasonId;
  reasonPath?: string;
  details?: string;
  reportedUserId?: string;
  productId?: string;
  locale?: string;
};

export async function submitChatRoomReport(input: SubmitChatRoomReportInput) {
  const roomId = input.roomId.trim();
  if (!roomId) return { error: "Report target not found." as const };

  const reasonLabel =
    input.reasonPath?.trim() ||
    REPORT_REASONS.find((r) => r.id === input.reason)?.label ||
    input.reason;
  const details = input.details?.trim();

  const member = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: input.reporterId } },
    select: { userId: true },
  });
  if (!member) return { error: "You can't access this chat." as const };

  const room = await db.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      status: true,
      type: true,
      members: { select: { userId: true } },
    },
  });
  if (!room) return { error: "Conversation not found." as const };
  if (room.status === "READ_ONLY") {
    return { error: "This chat is already locked from a report." as const };
  }

  if (room.type !== "DM" && room.type !== "MARKET" && room.type !== "GROUP") {
    return { error: "This chat can't be reported." as const };
  }

  const otherMemberId =
    input.reportedUserId?.trim() ||
    room.members.find((m) => m.userId !== input.reporterId)?.userId;
  if (!otherMemberId) return { error: "Reported user not found." as const };

  const recent = await db.report.findFirst({
    where: {
      reporterId: input.reporterId,
      targetType: "CHAT_ROOM",
      targetId: roomId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return { error: "You recently reported this chat." as const };

  const reportedUserIp = (await latestUserIp(otherMemberId)) ?? "unknown";
  const reporterIp = input.reporterIp.trim() || "unknown";
  const lockContent = chatReportLockMessage(input.locale ?? "ko");

  let moderationCaseId: string | undefined;
  const { scoreAfter } = await addRiskScore({
    userId: otherMemberId,
    reason: riskReasonForReport(input.reason),
    source: "REPORT",
    metadata: { targetType: "CHAT_ROOM", targetId: roomId, reporterId: input.reporterId },
  });
  const moderationCase = await upsertModerationCaseForReport(otherMemberId, scoreAfter);
  moderationCaseId = moderationCase.id;

  const result = await db.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        reporterId: input.reporterId,
        targetType: "CHAT_ROOM",
        targetId: roomId,
        chatRoomId: roomId,
        reason: reasonLabel,
        details: details || null,
        reportedUserId: otherMemberId,
        productId: input.productId?.trim() || null,
        reporterIp,
        reportedUserIp,
        moderationCaseId,
        status: "PENDING",
      },
    });

    await tx.chatRoom.update({
      where: { id: roomId },
      data: { status: "READ_ONLY" },
    });

    const systemMessage = await tx.message.create({
      data: {
        roomId,
        senderId: input.reporterId,
        content: lockContent,
        isSystemMessage: true,
      },
      include: chatMessageInclude,
    });

    return { report, systemMessage };
  });

  void relayChatMessageToSocket(roomId, serializeChatMessageForRelay(result.systemMessage));

  return {
    success: true as const,
    reportId: result.report.id,
    systemMessage: {
      id: result.systemMessage.id,
      content: result.systemMessage.content,
      createdAt: result.systemMessage.createdAt.toISOString(),
      isSystemMessage: true,
    },
    message: "Report received. This chat is locked.",
  };
}
