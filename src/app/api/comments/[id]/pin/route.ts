import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireApiUser } from "@/lib/api-post-auth";
import {
  MAX_PINNED_COMMENTS,
  canPinComment,
  type CommentViewer,
} from "@/lib/comment-service";
import { notifyCommentPinned } from "@/lib/notifications";

async function loadViewer(): Promise<CommentViewer> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    username: session.user.username ?? "",
    role: session.user.role ?? "USER",
    email: session.user.email,
  };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(_req, "comment-pin", 30);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const viewer = await loadViewer();
  if (!viewer) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const comment = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null, hiddenAt: null },
    select: {
      id: true,
      authorId: true,
      postId: true,
      parentId: true,
      pinnedAt: true,
      post: { select: { authorId: true } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }
  if (comment.parentId) {
    return NextResponse.json({ error: "답글은 고정할 수 없습니다." }, { status: 400 });
  }
  if (!canPinComment(viewer, comment.post.authorId)) {
    return NextResponse.json({ error: "고정 권한이 없습니다." }, { status: 403 });
  }
  if (comment.pinnedAt) {
    return NextResponse.json({ ok: true, pinned: true });
  }

  const pinnedCount = await db.comment.count({
    where: {
      postId: comment.postId,
      parentId: null,
      pinnedAt: { not: null },
      deletedAt: null,
    },
  });
  if (pinnedCount >= MAX_PINNED_COMMENTS) {
    return NextResponse.json(
      { error: `고정 댓글은 최대 ${MAX_PINNED_COMMENTS}개까지 가능합니다.` },
      { status: 400 }
    );
  }

  await db.comment.update({
    where: { id: commentId },
    data: { pinnedAt: new Date() },
  });

  void notifyCommentPinned({
    postId: comment.postId,
    commentId,
    commentAuthorId: comment.authorId,
    actorId: viewer.id,
  });

  revalidatePath(`/post/${comment.postId}`);
  return NextResponse.json({ ok: true, pinned: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(_req, "comment-unpin", 30);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const viewer = await loadViewer();
  if (!viewer) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const comment = await db.comment.findFirst({
    where: { id: commentId },
    select: {
      id: true,
      postId: true,
      pinnedAt: true,
      post: { select: { authorId: true } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!canPinComment(viewer, comment.post.authorId)) {
    return NextResponse.json({ error: "고정 해제 권한이 없습니다." }, { status: 403 });
  }

  if (comment.pinnedAt) {
    await db.comment.update({
      where: { id: commentId },
      data: { pinnedAt: null },
    });
  }

  revalidatePath(`/post/${comment.postId}`);
  return NextResponse.json({ ok: true, pinned: false });
}
