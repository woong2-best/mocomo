import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getMobileRoomMessages, sendMobileDmMessage } from "@/lib/chat-dm-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-messages-room", 120);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { roomId } = await params;
  if (!roomId || roomId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const before = req.nextUrl.searchParams.get("before");
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "40");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 40;

  const result = await getMobileRoomMessages(authResult.user.id, roomId, { before, limit });
  if ("error" in result) {
    const status =
      result.error === "FORBIDDEN" ? 403 : result.error === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}

const sendSchema = z.object({
  content: z.string().max(4000).optional(),
  replyToId: z.string().max(64).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url().max(2000),
        type: z.enum(["IMAGE", "VIDEO", "AUDIO", "GIF", "STICKER", "FILE"]),
        name: z.string().max(200).optional(),
      })
    )
    .max(4)
    .optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-messages-send", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "dm" });
  if ("error" in authResult) return authResult.error;

  const { roomId } = await params;
  if (!roomId || roomId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "메시지 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const result = await sendMobileDmMessage(authResult.user.id, {
    roomId,
    content: parsed.data.content,
    replyToId: parsed.data.replyToId,
    attachments: parsed.data.attachments,
  });

  if ("error" in result) {
    const status = result.error === "NOT_MEMBER" ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
