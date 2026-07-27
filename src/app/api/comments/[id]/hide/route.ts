import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireApiUser } from "@/lib/api-post-auth";
import { isCommentAdmin, type CommentViewer } from "@/lib/comment-service";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";

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

/** Admin soft-hide */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(_req, "comment-hide", 30);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const viewer = await loadViewer();
  if (!viewer || !isCommentAdmin(viewer)) {
    return NextResponse.json({ error: "관리자만 숨길 수 있습니다." }, { status: 403 });
  }

  const comment = await db.comment.findFirst({
    where: { id: commentId },
    select: { id: true, postId: true, hiddenAt: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  await db.comment.update({
    where: { id: commentId },
    data: { hiddenAt: new Date(), pinnedAt: null },
  });

  void logSiteAdminAudit({
    actorId: viewer.id,
    action: "comment.hide",
    targetType: "comment",
    targetId: commentId,
    metadata: { postId: comment.postId },
  });

  revalidatePath(`/post/${comment.postId}`);
  return NextResponse.json({ ok: true, hidden: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(_req, "comment-unhide", 30);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const authResult = await requireApiUser({ writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const viewer = await loadViewer();
  if (!viewer || !isCommentAdmin(viewer)) {
    return NextResponse.json({ error: "관리자만 해제할 수 있습니다." }, { status: 403 });
  }

  const comment = await db.comment.findFirst({
    where: { id: commentId },
    select: { id: true, postId: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  await db.comment.update({
    where: { id: commentId },
    data: { hiddenAt: null },
  });

  revalidatePath(`/post/${comment.postId}`);
  return NextResponse.json({ ok: true, hidden: false });
}
