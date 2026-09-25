import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-post-auth";
import { notifyPostLike } from "@/lib/notifications";
import { qnaEngagementError } from "@/lib/post-scope";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-like", 120);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true, communityId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }
    const blocked = qnaEngagementError(post.communityId);
    if (blocked) {
      return NextResponse.json({ error: blocked }, { status: 403 });
    }
    const existing = await db.like.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    });
    if (existing) {
      await db.like.delete({ where: { id: existing.id } });
      const count = await db.like.count({ where: { postId } });
      return NextResponse.json({ liked: false, likeCount: count });
    }
    await db.like.create({ data: { userId: user.id, postId } });
    if (post.authorId !== user.id) {
      void notifyPostLike(postId, post.authorId, user.id);
    }
    const count = await db.like.count({ where: { postId } });
    return NextResponse.json({ liked: true, likeCount: count });
  } catch (e) {
    console.error("[api/posts/like]", e);
    return NextResponse.json({ error: "좋아요 처리에 실패했습니다." }, { status: 500 });
  }
}
