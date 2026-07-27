"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  notifyCommentAdded,
  notifyCommentConfirmed,
  notifyCommentFailed,
} from "@/lib/comment-optimistic-sync";
import { cn } from "@/lib/utils";

export function CommentForm({
  postId,
  parentId,
  placeholder,
  className,
  inputClassName,
}: {
  postId: string;
  parentId?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const session = useSession();
  const user = session?.data?.user;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || !user) return;

    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setContent("");
    setError("");

    notifyCommentAdded(postId, {
      id: pendingId,
      content: text,
      parentId,
      pending: true,
      author: {
        name: user.name ?? null,
        username: user.username ?? user.name ?? "me",
        supportTierSent: null,
      },
      replies: [],
    });

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, parentId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "댓글 등록에 실패했습니다.");
      }
      const realId =
        typeof body?.comment?.id === "string" ? body.comment.id : pendingId;
      notifyCommentConfirmed(postId, pendingId, realId);
      // Background sync — do not block UI
      router.refresh();
    } catch (err) {
      notifyCommentFailed(postId, pendingId);
      setContent(text);
      setError(err instanceof Error ? err.message : "댓글 등록에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            placeholder ??
            (parentId ? "대댓글..." : "댓글을 입력하세요...")
          }
          className={cn(
            "flex-1 h-10 rounded-lg border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
            inputClassName
          )}
        />
        <Button type="submit" size="sm" disabled={!content.trim()}>
          등록
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
