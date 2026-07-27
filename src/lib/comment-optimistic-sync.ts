"use client";

export const COMMENT_ADDED_EVENT = "mocomo:comment-added";
export const COMMENT_CONFIRMED_EVENT = "mocomo:comment-confirmed";
export const COMMENT_FAILED_EVENT = "mocomo:comment-failed";
export const COMMENT_UPDATED_EVENT = "mocomo:comment-updated";
export const COMMENT_REMOVED_EVENT = "mocomo:comment-removed";

export type OptimisticCommentAuthor = {
  id?: string;
  name: string | null;
  username: string;
  image?: string | null;
  supportTierSent?: string | null;
};

export type OptimisticComment = {
  id: string;
  content: string;
  parentId?: string;
  pending?: boolean;
  author: OptimisticCommentAuthor;
  replies: { id: string; content: string; author: OptimisticCommentAuthor }[];
};

export function notifyCommentAdded(postId: string, comment: OptimisticComment) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMMENT_ADDED_EVENT, { detail: { postId, comment } })
  );
}

export function notifyCommentConfirmed(postId: string, pendingId: string, realId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMMENT_CONFIRMED_EVENT, {
      detail: { postId, pendingId, realId },
    })
  );
}

export function notifyCommentFailed(postId: string, pendingId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMMENT_FAILED_EVENT, { detail: { postId, pendingId } })
  );
}

export function notifyCommentUpdated(
  postId: string,
  commentId: string,
  content: string
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMMENT_UPDATED_EVENT, {
      detail: { postId, commentId, content },
    })
  );
}

export function notifyCommentRemoved(postId: string, commentId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMMENT_REMOVED_EVENT, { detail: { postId, commentId } })
  );
}
