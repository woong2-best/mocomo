import { db } from "@/lib/db";

export type ResolvedCommentReply = {
  /** Always the top-level comment id. */
  parentId: string;
  /** Author of the row the user tapped Reply on. */
  replyToUserId: string;
  /** Same as replyToUserId — used for comment_reply notifications. */
  notifyUserId: string;
};

export { rootCommentId, walkReplyRoot } from "@/lib/comment-thread-root";

export async function resolveCommentReplyTarget(params: {
  postId: string;
  parentId: string;
  replyToUserId?: string | null;
}): Promise<
  | { ok: true; value: ResolvedCommentReply }
  | { ok: false; error: string; status: number }
> {
  const clicked = await db.comment.findFirst({
    where: {
      id: params.parentId,
      postId: params.postId,
      deletedAt: null,
      hiddenAt: null,
    },
    select: { id: true, authorId: true, parentId: true },
  });
  if (!clicked) {
    return { ok: false, error: "Not found.", status: 400 };
  }

  let rootId = clicked.id;
  let cursor: { id: string; authorId: string; parentId: string | null } = clicked;
  for (let i = 0; i < 8 && cursor.parentId; i++) {
    const up = await db.comment.findFirst({
      where: { id: cursor.parentId, postId: params.postId },
      select: { id: true, authorId: true, parentId: true },
    });
    if (!up) break;
    cursor = up;
    rootId = up.id;
  }

  let replyToUserId = clicked.authorId;
  const requested =
    typeof params.replyToUserId === "string" &&
    params.replyToUserId.length > 0 &&
    params.replyToUserId.length <= 64
      ? params.replyToUserId
      : null;
  if (requested) {
    const target = await db.user.findFirst({
      where: { id: requested, deletedAt: null },
      select: { id: true },
    });
    if (target) replyToUserId = target.id;
  }

  return {
    ok: true,
    value: {
      parentId: rootId,
      replyToUserId,
      notifyUserId: replyToUserId,
    },
  };
}
