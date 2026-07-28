import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { notifyPostLike } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-post-like", 120);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  try {
    const existing = await db.like.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    });
    if (existing) {
      await db.like.delete({ where: { id: existing.id } });
      const count = await db.like.count({ where: { postId } });
      return NextResponse.json({ liked: false, likeCount: count });
    }
    await db.like.create({ data: { userId: user.id, postId } });
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (post && post.authorId !== user.id) {
      void notifyPostLike(postId, post.authorId, user.id);
    }
    const count = await db.like.count({ where: { postId } });
    return NextResponse.json({ liked: true, likeCount: count });
  } catch (e) {
    console.error("[api/mobile/posts/like]", e);
    return NextResponse.json({ error: "좋아요 처리에 실패했습니다." }, { status: 500 });
  }
}
