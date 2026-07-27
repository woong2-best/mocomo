import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-post-auth";
import { notifyCommentLiked } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "comment-like", 80);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "default" });
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const comment = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null, hiddenAt: null },
    select: {
      id: true,
      authorId: true,
      postId: true,
      likeCount: true,
      post: { select: { authorId: true } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  const existing = await db.commentLike.findUnique({
    where: {
      userId_commentId: { userId: user.id, commentId },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      liked: true,
      likeCount: comment.likeCount,
      likedByAuthor: user.id === comment.post.authorId,
    });
  }

  await db.$transaction([
    db.commentLike.create({
      data: { userId: user.id, commentId },
    }),
    db.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    }),
  ]);

  void notifyCommentLiked({
    postId: comment.postId,
    commentId,
    commentAuthorId: comment.authorId,
    actorId: user.id,
    postAuthorId: comment.post.authorId,
  });

  return NextResponse.json({
    ok: true,
    liked: true,
    likeCount: comment.likeCount + 1,
    likedByAuthor: user.id === comment.post.authorId,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(_req, "comment-unlike", 80);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "default" });
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const comment = await db.comment.findFirst({
    where: { id: commentId },
    select: {
      id: true,
      likeCount: true,
      post: { select: { authorId: true } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  const existing = await db.commentLike.findUnique({
    where: {
      userId_commentId: { userId: user.id, commentId },
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({
      ok: true,
      liked: false,
      likeCount: comment.likeCount,
      likedByAuthor: false,
    });
  }

  await db.$transaction([
    db.commentLike.delete({
      where: { userId_commentId: { userId: user.id, commentId } },
    }),
    db.comment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
    }),
  ]);

  const nextCount = Math.max(0, comment.likeCount - 1);
  // Clamp negative likeCount if ever desynced
  if (nextCount === 0 && comment.likeCount < 1) {
    await db.comment.update({
      where: { id: commentId },
      data: { likeCount: 0 },
    });
  }

  return NextResponse.json({
    ok: true,
    liked: false,
    likeCount: nextCount,
    likedByAuthor: false,
  });
}
