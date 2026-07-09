import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-post-auth";
import { notifyPostRepost } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-repost", 60);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  try {
    const existing = await db.repost.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    });
    if (existing) {
      await db.repost.delete({ where: { id: existing.id } });
      const count = await db.repost.count({ where: { postId } });
      return NextResponse.json({ reposted: false, repostCount: count });
    }
    await db.repost.create({ data: { userId: user.id, postId } });
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (post) void notifyPostRepost(postId, post.authorId, user.id);
    const count = await db.repost.count({ where: { postId } });
    return NextResponse.json({ reposted: true, repostCount: count });
  } catch (e) {
    console.error("[api/posts/repost]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/repost|does not exist|relation/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "리트윗 DB가 없습니다. Supabase SQL Editor에서 scripts/fix-repost-comments.sql 을 실행해 주세요.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "리포스트 처리에 실패했습니다." }, { status: 500 });
  }
}
