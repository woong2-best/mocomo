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
    const existing = await db.repost.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    });
    if (existing) {
      await db.repost.delete({ where: { id: existing.id } });
      const count = await db.repost.count({ where: { postId } });
      return NextResponse.json({ reposted: false, repostCount: count });
    }
    await db.repost.create({ data: { userId: user.id, postId } });
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
