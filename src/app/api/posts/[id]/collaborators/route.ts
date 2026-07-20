import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireApiUser } from "@/lib/api-post-auth";
import { auth } from "@/lib/auth";
import {
  CollaboratorError,
  inviteCollaborators,
  listCollaborators,
} from "@/lib/post-collaborators";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-collab-list", 60);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const session = await auth();
  try {
    const data = await listCollaborators(postId, session?.user?.id ?? null);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof CollaboratorError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[api/posts/collaborators GET]", e);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-collab-invite", 30);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body: { userIds?: string[] };
  try {
    body = (await req.json()) as { userIds?: string[] };
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const userIds = Array.isArray(body.userIds) ? body.userIds.map(String) : [];
  try {
    const result = await inviteCollaborators(postId, user.id, userIds);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof CollaboratorError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[api/posts/collaborators POST]", e);
    return NextResponse.json({ error: "초대에 실패했습니다." }, { status: 500 });
  }
}
