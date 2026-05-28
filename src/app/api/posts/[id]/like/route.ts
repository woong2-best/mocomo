import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-post-auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser();
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
      await db.notification.create({
        data: {
          userId: post.authorId,
          type: "like",
          title: "좋아요",
          body: `${user.username}님이 게시물을 좋아합니다.`,
          link: `/post/${postId}`,
        },
      });
    }
    const count = await db.like.count({ where: { postId } });
    return NextResponse.json({ liked: true, likeCount: count });
  } catch (e) {
    console.error("[api/posts/like]", e);
    return NextResponse.json({ error: "좋아요 처리에 실패했습니다." }, { status: 500 });
  }
}
