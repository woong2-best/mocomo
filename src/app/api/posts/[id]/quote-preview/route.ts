import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { platformPostWhere } from "@/lib/post-scope";
import { quotedPostPreviewSelect, toQuotedPostPreview } from "@/lib/quoted-post";

/** Quote compose — original post snapshot (auth required). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-quote-preview", 90);
  if (limited) return limited;

  const viewerId = (await getMobileUserId(req)) ?? (await auth())?.user?.id;
  if (!viewerId) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const post = await db.post.findFirst({
    where: { id, ...platformPostWhere },
    select: quotedPostPreviewSelect,
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const preview = toQuotedPostPreview(post);
  return NextResponse.json({ post: preview });
}
