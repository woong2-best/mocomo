import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi, getClientIpFromRequest } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { submitChatRoomReport } from "@/lib/chat-report";
import { isReportReasonId } from "@/lib/report-reasons";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const bodySchema = z.object({
  roomId: z.string().min(1).max(64),
  reason: z.string().max(64),
  reasonPath: z.string().max(500).optional(),
  details: z.string().max(4000).optional(),
  reportedUserId: z.string().max(64).optional(),
  productId: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "reports-chat", 20);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "신고 정보를 확인해 주세요." }, { status: 400 });
  }

  const reporterIp = getClientIpFromRequest(req);
  const h = await headers();
  const locale = h.get("x-mocomo-locale")?.startsWith("en") ? "en" : "ko";

  const bearer = await requireMobileApiUser(req, { writeKind: "report" });
  let reporterId: string;
  if ("error" in bearer) {
    const session = await auth();
    if (!session?.user?.id) return bearer.error;
    reporterId = session.user.id;
  } else {
    reporterId = bearer.user.id;
  }

  if (!isReportReasonId(parsed.data.reason)) {
    return NextResponse.json({ error: "신고 사유를 선택해 주세요." }, { status: 400 });
  }

  const result = await submitChatRoomReport({
    reporterId,
    reporterIp,
    roomId: parsed.data.roomId,
    reason: parsed.data.reason,
    reasonPath: parsed.data.reasonPath,
    details: parsed.data.details,
    reportedUserId: parsed.data.reportedUserId,
    productId: parsed.data.productId,
    locale,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }

  return NextResponse.json(result);
}
