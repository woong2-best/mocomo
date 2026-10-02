import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-post-auth";
import { notifyPostRepost } from "@/lib/notifications";
import { qnaEngagementError } from "@/lib/post-scope";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-repost", 60);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    const blocked = qnaEngagementError(post.communityId);
    if (blocked) {
      return NextResponse.json({ error: blocked }, { status: 403 });
    }
    const existing = await db.repost.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    });
    if (existing) {
      await db.repost.delete({ where: { id: existing.id } });
      const count = await db.repost.count({ where: { postId } });
      return NextResponse.json({ reposted: false, repostCount: count });
    }
    await db.repost.create({ data: { userId: user.id, postId } });
    void notifyPostRepost(postId, post.authorId, user.id);
    const count = await db.repost.count({ where: { postId } });
    return NextResponse.json({ reposted: true, repostCount: count });
  } catch (e) {
    console.error("[api/posts/repost]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/repost|does not exist|relation/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Not found.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
