"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState, type KeyboardEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  notifyCommentAdded,
  notifyCommentConfirmed,
  notifyCommentFailed,
} from "@/lib/comment-optimistic-sync";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";


export function CommentForm({
  postId,
  parentId,
  placeholder,
  className,
  inputClassName,
  autoFocus,
  onSubmitted,
}: {
  postId: string;
  parentId?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
}) {
  const { locale, t } = useLocale();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const session = useSession();
  const user = session?.data?.user;

  async function submit() {
    const text = content.trim();
    if (!text || !user || submitting) return;

    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setContent("");
    setError("");
    setSubmitting(true);

    notifyCommentAdded(postId, {
      id: pendingId,
      content: text,
      parentId,
      pending: true,
      author: {
        id: user.id,
        name: user.name ?? null,
        username: user.username ?? user.name ?? "me",
        image: user.image ?? null,
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
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : t("ui.couldn_t_post_comment")
        );
      }
      const realId =
        typeof body?.comment?.id === "string" ? body.comment.id : pendingId;
      notifyCommentConfirmed(postId, pendingId, realId);
      onSubmitted?.();
      router.refresh();
    } catch (err) {
      notifyCommentFailed(postId, pendingId);
      setContent(text);
      setError(
        err instanceof Error
          ? err.message
          : t("ui.couldn_t_post_comment")
      );
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          autoFocus={autoFocus}
          placeholder={
            placeholder ??
            (parentId
              ? t("ui.write_a_reply")
              : t("post.writeComment"))
          }
          className={cn(
            "max-h-28 min-h-10 flex-1 resize-none rounded-full border border-border bg-background/50 px-4 py-2.5 text-sm leading-snug focus:outline-none focus:ring-2 focus:ring-primary/40",
            inputClassName
          )}
        />
        <Button type="submit" size="sm" disabled={!content.trim() || submitting}>
          {t("star.badge.post")}
        </Button>
      </div>
      {content.trim() ? (
        <p className="px-1 text-[11px] text-muted-foreground">
          {t("ui.enter_to_post_shift_enter_for")}
        </p>
      ) : null}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
