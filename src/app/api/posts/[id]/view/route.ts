import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { recordPostViewEvent } from "@/lib/follow-recommendations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-view", 120);
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    const post = await db.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { authorId: true, postType: true, viewCount: true },
    });

    const session = await auth();
    const userId = session?.user?.id;
    if (userId && post.authorId) {
      void recordPostViewEvent(userId, id, post.authorId).catch(() => {});
      // VIDEO 포스트는 조회도 시청 시그널로 약하게 기록
      if (post.postType === "VIDEO") {
        const { recordVideoWatch } = await import("@/lib/follow-recommendations");
        void recordVideoWatch({
          userId,
          postId: id,
          authorId: post.authorId,
          watchSeconds: 5,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, viewCount: post.viewCount });
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
