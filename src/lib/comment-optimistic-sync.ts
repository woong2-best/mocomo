"use client";

export const COMMENT_ADDED_EVENT = "mocomo:comment-added";
export const COMMENT_CONFIRMED_EVENT = "mocomo:comment-confirmed";
export const COMMENT_FAILED_EVENT = "mocomo:comment-failed";

export type OptimisticCommentAuthor = {
  name: string | null;
  username: string;
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
