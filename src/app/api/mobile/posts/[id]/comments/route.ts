import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { getMobileUserId, requireMobileApiUser } from "@/lib/api-mobile-auth";
import { notifyPostComment } from "@/lib/notifications";
import { userPublicSelect } from "@/lib/user-public-select";
import { getPostCommentsPage } from "@/lib/comment-service";
import type { PostCommentSort } from "@/lib/post-queries";

function parseSort(raw: string | null): PostCommentSort {
  if (raw === "newest" || raw === "popular" || raw === "oldest") return raw;
  return "popular";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-post-comment-list", 120);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const sort = parseSort(req.nextUrl.searchParams.get("sort"));
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
    : 20;
  const cursor = req.nextUrl.searchParams.get("cursor");

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
    }

    const viewerId = await getMobileUserId(req);
    const page = await getPostCommentsPage({
      postId,
      postAuthorId: post.authorId,
      sort,
      limit,
      cursor,
      viewerId,
      includePinned: true,
    });

    return NextResponse.json({
      ...page,
      postAuthorId: post.authorId,
      viewerId,
    });
  } catch (e) {
    console.error("[api/mobile/posts/comments GET]", e);
    return NextResponse.json({ error: "댓글을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-post-comment", 40);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireMobileApiUser(req, { writeKind: "comment" });
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
        where: { id: parentId, postId, deletedAt: null, hiddenAt: null },
        select: { id: true, authorId: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "원 댓글을 찾을 수 없습니다." }, { status: 400 });
      }
      parentCommentAuthorId = parent.authorId;
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: userPublicSelect,
    });

    const comment = await db.comment.create({
      data: { content, authorId: user.id, postId, parentId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        likeCount: true,
        authorId: true,
        parentId: true,
        author: { select: userPublicSelect },
      },
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

    return NextResponse.json({
      ok: true,
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        likeCount: 0,
        likedByMe: false,
        parentId: comment.parentId,
        author: fullUser ?? comment.author,
      },
    });
  } catch (e) {
    console.error("[api/mobile/posts/comments]", e);
    return NextResponse.json({ error: "댓글 작성에 실패했습니다." }, { status: 500 });
  }
}
