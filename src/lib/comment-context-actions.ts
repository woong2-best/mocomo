"use client";

import { submitContentReport } from "@/actions/report";
import { blockUserAction, toggleMuteUserAction } from "@/actions/user-relationship";
import { notifyCommentRemoved } from "@/lib/comment-optimistic-sync";

export async function pinCommentAction(commentId: string, next: boolean) {
  const res = await fetch(`/api/comments/${commentId}/pin`, {
    method: next ? "POST" : "DELETE",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error || "Failed");
}

export async function shareCommentAction(postId: string, commentId: string) {
  const url = `${window.location.origin}/post/${postId}#comment-${commentId}`;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ url });
      return;
    } catch {
      /* fall through to clipboard */
    }
  }
  await navigator.clipboard.writeText(url);
}

export async function quiteCommentAuthorAction(authorId: string, username: string) {
  const res = await toggleMuteUserAction(authorId, username);
  if (res && "error" in res && res.error) throw new Error(String(res.error));
}

export async function reportCommentAction(input: {
  commentId: string;
  authorId: string;
  postId: string;
}) {
  const res = await submitContentReport({
    targetType: "COMMENT",
    targetId: input.commentId,
    reason: "SPAM",
    reportedUserId: input.authorId,
    postId: input.postId,
    commentId: input.commentId,
  });
  if (res.error) throw new Error(res.error);
}

export async function blockCommentAuthorAction(authorId: string, username: string) {
  const res = await blockUserAction(authorId, username);
  if (res.error) throw new Error(res.error);
}

export async function deleteCommentAction(postId: string, commentId: string) {
  const res = await fetch(`/api/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error || "Failed");
  notifyCommentRemoved(postId, commentId);
}
