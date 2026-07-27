import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-post-auth";
import { notifyPostComment } from "@/lib/notifications";
import {
  countPostComments,
  getPostComments,
  type PostCommentSort,
} from "@/lib/post-queries";

function parseSort(raw: string | null): PostCommentSort {
  if (raw === "newest" || raw === "popular" || raw === "oldest") return raw;
  return "newest";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-comment-list", 120);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const sort = parseSort(req.nextUrl.searchParams.get("sort"));
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "40");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(80, Math.max(1, Math.floor(limitRaw)))
    : 40;

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }

    const [comments, total] = await Promise.all([
      getPostComments(postId, limit, sort),
      countPostComments(postId),
    ]);

    return NextResponse.json({
      comments: comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        replies: c.replies.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      })),
      total,
      sort,
    });
  } catch (e) {
    console.error("[api/posts/comments GET]", e);
    return NextResponse.json({ error: "댓글을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-comment", 40);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "comment" });
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
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }

    let parentCommentAuthorId: string | undefined;
    if (parentId) {
      const parent = await db.comment.findFirst({
        where: { id: parentId, postId },
        select: { id: true, authorId: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "원 댓글을 찾을 수 없습니다." }, { status: 400 });
      }
      parentCommentAuthorId = parent.authorId;
    }

    const comment = await db.comment.create({
      data: { content, authorId: user.id, postId, parentId },
      select: { id: true, createdAt: true },
    });

    void notifyPostComment({
      postId,
      postAuthorId: post.authorId,
      commentId: comment.id,
      actorId: user.id,
      parentCommentAuthorId,
      content,
    });

    revalidatePath(`/post/${postId}`);
    revalidatePath("/feed");
    revalidatePath("/reels");
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
