import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireApiUser } from "@/lib/api-post-auth";
import {
  canDeleteComment,
  canEditComment,
  isCommentAdmin,
  type CommentViewer,
} from "@/lib/comment-service";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";

async function loadViewer(): Promise<CommentViewer> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true, email: true },
  });
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "comment-edit", 40);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "comment" });
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content || content.length > 4000) {
    return NextResponse.json({ error: "댓글 내용을 확인해 주세요." }, { status: 400 });
  }

  const comment = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: {
      id: true,
      authorId: true,
      postId: true,
      post: { select: { authorId: true } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  const viewer: CommentViewer = {
    id: user.id,
    username: (await db.user.findUnique({
      where: { id: user.id },
      select: { username: true },
    }))?.username ?? "",
    role: "USER",
  };
  // Prefer session fields if present
  const session = await auth();
  if (session?.user) {
    viewer.username = session.user.username ?? viewer.username;
    viewer.role = session.user.role ?? "USER";
    viewer.email = session.user.email;
  }

  if (!canEditComment(viewer, comment.authorId)) {
    return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
  }

  const updated = await db.comment.update({
    where: { id: commentId },
    data: { content },
    select: { id: true, content: true, updatedAt: true },
  });

  revalidatePath(`/post/${comment.postId}`);
  return NextResponse.json({
    ok: true,
    comment: {
      id: updated.id,
      content: updated.content,
      updatedAt: updated.updatedAt.toISOString(),
      isEdited: true,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "comment-delete", 40);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "comment" });
  if ("error" in authResult) return authResult.error;

  const viewer = await loadViewer();
  if (!viewer) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const comment = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: {
      id: true,
      authorId: true,
      postId: true,
      pinnedAt: true,
      post: { select: { authorId: true } },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!canDeleteComment(viewer, comment.authorId, comment.post.authorId)) {
    return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
  }

  const hard = req.nextUrl.searchParams.get("hard") === "1" && isCommentAdmin(viewer);

  if (hard) {
    await db.comment.delete({ where: { id: commentId } });
    void logSiteAdminAudit({
      actorId: viewer.id,
      action: "comment.force_delete",
      targetType: "comment",
      targetId: commentId,
      metadata: { postId: comment.postId },
    });
  } else {
    await db.comment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
        pinnedAt: null,
        content: "",
      },
    });
  }

  revalidatePath(`/post/${comment.postId}`);
  revalidatePath("/feed");
  revalidatePath("/reels");
  return NextResponse.json({ ok: true });
}
