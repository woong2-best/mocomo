import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { addChatMemberByUsername } from "@/lib/chat-group-invite";

const bodySchema = z.object({
  username: z.string().min(1).max(64),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-messages-add-member", 20);
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "아이디를 입력해 주세요." }, { status: 400 });
  }

  const result = await addChatMemberByUsername(authResult.user.id, roomId, parsed.data.username);
  if ("error" in result) {
    const status = result.error === "NOT_MEMBER" ? 403 : 400;
    const message = result.error === "NOT_MEMBER" ? "대화 멤버만 추가할 수 있습니다." : result.error;
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json(result);
}
