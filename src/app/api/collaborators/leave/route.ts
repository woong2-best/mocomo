import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireApiUser } from "@/lib/api-post-auth";
import {
  CollaboratorError,
  leaveCollaboration,
} from "@/lib/post-collaborators";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "collab-leave", 30);
  if (limited) return limited;

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body: { postId?: string };
  try {
    body = (await req.json()) as { postId?: string };
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const postId = String(body.postId ?? "").trim();
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    await leaveCollaboration(postId, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CollaboratorError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[api/collaborators/leave]", e);
    return NextResponse.json({ error: "나가기에 실패했습니다." }, { status: 500 });
  }
}
