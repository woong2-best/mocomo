import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-post-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-star", 60);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  try {
    const existing = await db.bookmark.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    });
    if (existing) {
      await db.bookmark.delete({ where: { id: existing.id } });
      revalidatePath("/star");
      return NextResponse.json({ starred: false });
    }
    await db.bookmark.create({ data: { userId: user.id, postId } });
    revalidatePath("/star");
    return NextResponse.json({ starred: true });
  } catch (e) {
    console.error("[api/posts/star]", e);
    return NextResponse.json({ error: "STAR 저장에 실패했습니다." }, { status: 500 });
  }
}
