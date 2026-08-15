import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { notifyPostRepost } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-post-repost", 60);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  try {
    const existing = await db.repost.findUnique({
      where: { userId_postId: { userId: auth.user.id, postId } },
    });
    if (existing) {
      await db.repost.delete({ where: { id: existing.id } });
      const count = await db.repost.count({ where: { postId } });
      return NextResponse.json({ reposted: false, repostCount: count });
    }

    await db.repost.create({ data: { userId: auth.user.id, postId } });
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (post && post.authorId !== auth.user.id) {
      void notifyPostRepost(postId, post.authorId, auth.user.id);
    }
    const count = await db.repost.count({ where: { postId } });
    return NextResponse.json({ reposted: true, repostCount: count });
  } catch (e) {
    console.error("[api/mobile/posts/repost]", e);
    return NextResponse.json({ error: "재게시 처리에 실패했습니다." }, { status: 500 });
  }
}
