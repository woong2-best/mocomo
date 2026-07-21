import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { recordVideoWatch } from "@/lib/follow-recommendations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "video-watch", 90);
  if (limited) return limited;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: true, skipped: "guest" });
  }

  let body: {
    postId?: string;
    mediaId?: string;
    watchSeconds?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const postId = body.postId?.trim();
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "invalid postId" }, { status: 400 });
  }

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const watchSeconds =
    typeof body.watchSeconds === "number" && Number.isFinite(body.watchSeconds)
      ? Math.min(3600, Math.max(0, Math.floor(body.watchSeconds)))
      : 0;

  try {
    await recordVideoWatch({
      userId,
      postId,
      authorId: post.authorId,
      mediaId: body.mediaId?.trim() || null,
      watchSeconds,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/signals/video-watch]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
