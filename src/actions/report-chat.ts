"use server";

import { requireAuth } from "@/lib/auth";
import { submitChatRoomReport } from "@/lib/chat-report";
import type { ReportReasonId } from "@/lib/report-reasons";
import { getRequestIp } from "@/lib/request-ip";
import { getRequestLocale } from "@/lib/i18n/server";

export async function submitChatRoomReportAction(data: {
  roomId: string;
  reason: ReportReasonId;
  reasonPath?: string;
  details?: string;
  reportedUserId?: string;
  productId?: string;
}) {
  const user = await requireAuth({ writeKind: "report" });
  const [reporterIp, locale] = await Promise.all([getRequestIp(), getRequestLocale()]);
  return submitChatRoomReport({
    reporterId: user.id,
    reporterIp,
    roomId: data.roomId,
    reason: data.reason,
    reasonPath: data.reasonPath,
    details: data.details,
    reportedUserId: data.reportedUserId,
    productId: data.productId,
    locale,
  });
}
