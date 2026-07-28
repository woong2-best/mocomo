import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-post-star", 40);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
  }

  const existing = await db.bookmark.findUnique({
    where: { userId_postId: { userId: auth.user.id, postId } },
  });

  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } });
    revalidatePath("/star");
    return NextResponse.json({ starred: false });
  }

  await db.bookmark.create({ data: { userId: auth.user.id, postId } });
  revalidatePath("/star");
  return NextResponse.json({ starred: true });
}
