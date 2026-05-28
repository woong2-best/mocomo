import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-post-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body: { content?: string; parentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content || content.length > 4000) {
    return NextResponse.json({ error: "댓글 내용을 확인해 주세요." }, { status: 400 });
  }

  const parentId =
    typeof body.parentId === "string" && body.parentId.length > 0 && body.parentId.length <= 64
      ? body.parentId
      : undefined;

  try {
    const post = await db.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }

    if (parentId) {
      const parent = await db.comment.findFirst({
        where: { id: parentId, postId },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "원 댓글을 찾을 수 없습니다." }, { status: 400 });
      }
    }

    const comment = await db.comment.create({
      data: { content, authorId: user.id, postId, parentId },
      select: { id: true, createdAt: true },
    });

    revalidatePath(`/post/${postId}`);
    return NextResponse.json({ ok: true, comment });
  } catch (e) {
    console.error("[api/posts/comments]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/comment|does not exist|column/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "댓글 DB 설정이 필요합니다. Supabase SQL Editor에서 scripts/fix-repost-comments.sql 을 실행해 주세요.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "댓글 등록에 실패했습니다." }, { status: 500 });
  }
}
