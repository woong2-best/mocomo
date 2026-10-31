import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { canDeleteComment, type CommentViewer } from "@/lib/comment-service";

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-comment-delete", 40);
  if (limited) return limited;

  const { id: commentId } = await params;
  if (!commentId || commentId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const authResult = await requireMobileApiUser(req, { writeKind: "comment" });
  if ("error" in authResult) return authResult.error;
  const viewer = toViewer(authResult.user);

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
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!canDeleteComment(viewer, comment.authorId, comment.post.authorId)) {
    return NextResponse.json({ error: "You don't have permission to do that." }, { status: 403 });
  }

  await db.comment.update({
    where: { id: commentId },
    data: {
      deletedAt: new Date(),
      pinnedAt: null,
      content: "",
    },
  });

  revalidatePath(`/post/${comment.postId}`);
  revalidatePath("/");
  revalidatePath("/reels");
  return NextResponse.json({ ok: true });
}
