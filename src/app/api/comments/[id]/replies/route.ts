import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getCommentRepliesPage } from "@/lib/comment-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "comment-replies", 120);
  if (limited) return limited;

  const { id: parentId } = await params;
  if (!parentId || parentId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
    : 20;
  const cursor = req.nextUrl.searchParams.get("cursor");

  const parent = await db.comment.findFirst({
    where: { id: parentId, deletedAt: null },
    select: {
      id: true,
      postId: true,
      post: { select: { authorId: true } },
    },
  });
  if (!parent) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  const session = await auth();
  const page = await getCommentRepliesPage({
    parentId,
    postId: parent.postId,
    postAuthorId: parent.post.authorId,
    cursor,
    limit,
    viewerId: session?.user?.id ?? null,
  });

  return NextResponse.json(page);
}
