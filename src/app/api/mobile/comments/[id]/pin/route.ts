import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  MAX_PINNED_COMMENTS,
  canPinComment,
  type CommentViewer,
} from "@/lib/comment-service";
import { notifyCommentPinned } from "@/lib/notifications";

function toViewer(user: {
  id: string;
  username: string;
  role: string;
}): NonNullable<CommentViewer> {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: null,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-comment-pin", 30);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;
  const viewer = toViewer(authResult.user);

  const comment = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null, hiddenAt: null },
    select: {
      id: true,
      authorId: true,
      postId: true,
      parentId: true,
      pinnedAt: true,
      post: { select: { authorId: true, communityId: true } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (comment.parentId) {
    return NextResponse.json({ error: "Not found." }, { status: 400 });
  }
  if (comment.post.communityId) {
    return NextResponse.json(
      { error: "Pinning is only available on feed posts and videos." },
      { status: 400 }
    );
  }
  if (!canPinComment(viewer, comment.post.authorId)) {
    return NextResponse.json({ error: "You don't have permission to do that." }, { status: 403 });
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
      { error: `You can pin up to ${MAX_PINNED_COMMENTS} comments.` },
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-comment-unpin", 30);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;
  const viewer = toViewer(authResult.user);

  const comment = await db.comment.findFirst({
    where: { id: commentId },
    select: {
      id: true,
      postId: true,
      pinnedAt: true,
      post: { select: { authorId: true, communityId: true } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (comment.post.communityId) {
    return NextResponse.json(
      { error: "Pinning is only available on feed posts and videos." },
      { status: 400 }
    );
  }
  if (!canPinComment(viewer, comment.post.authorId)) {
    return NextResponse.json({ error: "You don't have permission to do that." }, { status: 403 });
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
