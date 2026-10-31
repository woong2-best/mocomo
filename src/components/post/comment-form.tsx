"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Send, X } from "lucide-react";
import { GfIcon } from "@/components/icons/gf-icon";
import { Button } from "@/components/ui/button";
import {
  notifyCommentAdded,
  notifyCommentConfirmed,
  notifyCommentFailed,
} from "@/lib/comment-optimistic-sync";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import { uploadImageBlob } from "@/lib/client-upload";
import { isGalleryImageFile, normalizeGalleryImageFile } from "@/lib/gallery-image-upload";
import { CommentAttachPreview } from "@/components/post/comment-media-view";
import { CommentCircleAvatar, commentDisplayName } from "@/components/post/comment-circle-avatar";
import { GiphyGifPicker } from "@/components/post/tenor-gif-picker";
import type { CommentGifMeta } from "@/lib/giphy-meta";
import { subscribeGiphySearch } from "@/lib/giphy-search-events";
import {
  MentionSuggestList,
  type MentionSuggestUser,
} from "@/components/compose/mention-suggest-list";
import { getMentionContext, insertMentionToken } from "@/lib/mention-utils";

type Attach = {
  mediaType: "PHOTO" | "GIF";
  mediaUrl: string;
  previewUrl: string;
  mediaMeta?: CommentGifMeta | null;
};

export function CommentForm({
  postId,
  parentId,
  replyToUserId,
  replyToUsername,
  onCancelReply,
  placeholder,
  submitLabel,
  className,
  inputClassName,
  replyBarClassName,
  autoFocus,
  inputRef,
  onSubmitted,
  variant = "default",
}: {
  postId: string;
  parentId?: string;
  replyToUserId?: string;
  replyToUsername?: string;
  onCancelReply?: () => void;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
  inputClassName?: string;
  replyBarClassName?: string;
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  onSubmitted?: () => void;
  variant?: "default" | "reels";
}) {
  const { t } = useLocale();
  const [content, setContent] = useState("");
  const [mentionUsers, setMentionUsers] = useState<MentionSuggestUser[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [attach, setAttach] = useState<Attach | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const fieldRef = inputRef ?? localInputRef;
  const lastPrefill = useRef("");
  const router = useRouter();
  const session = useSession();
  const user = session?.data?.user;
  const canSubmit = Boolean((content.trim() || attach) && user && !submitting && !uploading);

  function updateMentionContext(text: string, cursor: number) {
    const ctx = getMentionContext(text, cursor);
    if (ctx) {
      setMentionStart(ctx.start);
      setMentionQuery(ctx.query);
      setMentionOpen(true);
      setActiveIndex(0);
      return;
    }
    setMentionOpen(false);
  }

  useEffect(() => {
    if (!mentionOpen) {
      setMentionUsers([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/users/mention-search?q=${encodeURIComponent(mentionQuery)}`,
            { credentials: "include" }
          );
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as { users?: MentionSuggestUser[] };
          if (!cancelled) setMentionUsers(Array.isArray(data.users) ? data.users : []);
        } catch {
          if (!cancelled) setMentionUsers([]);
        }
      })();
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mentionOpen, mentionQuery]);

  function insertMention(username: string) {
    const el = fieldRef.current;
    const cursor = el?.selectionStart ?? content.length;
    const { next, caret } = insertMentionToken(content, mentionStart, cursor, username);
    setContent(next);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  }

  useEffect(() => {
    return subscribeGiphySearch((query) => {
      setGifQuery(query);
      setGifOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!replyToUsername) return;
    const mention = `@${replyToUsername} `;
    setContent((prev) => {
      if (!prev || prev === lastPrefill.current || /^@[A-Za-z0-9_]+\s*$/.test(prev)) {
        return mention;
      }
      return mention;
    });
    lastPrefill.current = mention;
    const el = fieldRef.current;
    requestAnimationFrame(() => {
      el?.focus();
      if (el) {
        const n = el.value.length;
        el.setSelectionRange(n, n);
      }
    });
  }, [fieldRef, replyToUserId, replyToUsername]);

  async function pickPhoto(file: File | undefined) {
    if (!file || attach || uploading) return;
    if (!isGalleryImageFile(file, true)) {
      setError(t("comments.photoInvalid"));
      return;
    }
    const normalized = normalizeGalleryImageFile(file);
    const localUrl = URL.createObjectURL(normalized);
    setAttach({ mediaType: "PHOTO", mediaUrl: localUrl, previewUrl: localUrl });
    setUploading(true);
    setError("");
    try {
      const url = await uploadImageBlob(normalized, normalized.name);
      setAttach({ mediaType: "PHOTO", mediaUrl: url, previewUrl: url });
    } catch (err) {
      setAttach(null);
      setError(err instanceof Error ? err.message : t("comments.photoFailed"));
    } finally {
      URL.revokeObjectURL(localUrl);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(opts?: { attach?: Attach | null; gifOnly?: boolean }) {
    const sent = opts && "attach" in opts ? opts.attach ?? null : attach;
    const text = opts?.gifOnly ? "" : content.trim();
    if ((!text && !sent) || !user || submitting || uploading) return;
    if (sent?.mediaType === "PHOTO" && sent.mediaUrl.startsWith("blob:")) return;

    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!opts?.gifOnly) {
      setContent("");
      setAttach(null);
    }
    setError("");
    setSubmitting(true);

    notifyCommentAdded(postId, {
      id: pendingId,
      content: text,
      parentId,
      replyToUserId,
      pending: true,
      mediaType: sent?.mediaType ?? "NONE",
      mediaUrl: sent?.mediaUrl ?? null,
      mediaMeta: sent?.mediaMeta ?? null,
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
        body: JSON.stringify({
          content: text,
          parentId,
          replyToUserId,
          mediaType: sent?.mediaType ?? "NONE",
          mediaUrl: sent?.mediaUrl ?? null,
          mediaMeta: sent?.mediaMeta ?? null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : t("ui.couldn_t_post_comment")
        );
      }
      const realId = typeof body?.comment?.id === "string" ? body.comment.id : pendingId;
      notifyCommentConfirmed(postId, pendingId, realId);
      lastPrefill.current = "";
      onSubmitted?.();
      router.refresh();
    } catch (err) {
      notifyCommentFailed(postId, pendingId);
      if (!opts?.gifOnly) {
        setContent(text);
        setAttach(sent);
      }
      setError(err instanceof Error ? err.message : t("ui.couldn_t_post_comment"));
    } finally {
      setSubmitting(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen && mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % mentionUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + mentionUsers.length) % mentionUsers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const user = mentionUsers[activeIndex];
        if (user) insertMention(user.username);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  function cancelReply() {
    if (content === lastPrefill.current || /^@[A-Za-z0-9_]+\s*$/.test(content)) {
      setContent("");
    }
    lastPrefill.current = "";
    onCancelReply?.();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className={cn("flex flex-col gap-2", className)}
    >
      {replyToUsername ? (
        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[12px] text-muted-foreground",
            replyBarClassName
          )}
        >
          <span>{t("comments.replyingTo", { username: replyToUsername })}</span>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5"
            aria-label={t("comments.cancelReply")}
            onClick={cancelReply}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {attach ? (
        <CommentAttachPreview
          url={attach.previewUrl}
          gif={attach.mediaType === "GIF"}
          onClear={() => {
            if (!uploading) setAttach(null);
          }}
        />
      ) : null}
      <div className={cn("flex gap-2", variant === "reels" ? "items-center" : "items-end")}>
        {variant === "reels" && user ? (
          <CommentCircleAvatar
            image={user.image}
            name={commentDisplayName({ username: user.username, name: user.name })}
            size={32}
          />
        ) : null}
        {variant === "default" ? (
          <div className="flex shrink-0 items-center gap-0.5 pb-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void pickPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              disabled={!!attach || uploading}
              onClick={() => fileRef.current?.click()}
              aria-label={t("comments.attachPhoto")}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              disabled={!!attach || uploading}
              onClick={() => {
                setGifQuery("");
                setGifOpen(true);
              }}
              aria-label={t("comments.attachGif")}
            >
              <GfIcon />
            </button>
          </div>
        ) : null}
        <div className="relative min-w-0 flex-1">
          {mentionOpen && mentionUsers.length > 0 ? (
            <MentionSuggestList
              users={mentionUsers}
              activeIndex={activeIndex}
              onSelect={insertMention}
              variant="inline"
            />
          ) : null}
          <textarea
            ref={fieldRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              updateMentionContext(e.target.value, e.target.selectionStart ?? e.target.value.length);
            }}
            onKeyUp={(e) =>
              updateMentionContext(
                e.currentTarget.value,
                e.currentTarget.selectionStart ?? e.currentTarget.value.length
              )
            }
            onClick={(e) =>
              updateMentionContext(
                e.currentTarget.value,
                e.currentTarget.selectionStart ?? e.currentTarget.value.length
              )
            }
            onKeyDown={onKeyDown}
            rows={1}
            autoFocus={autoFocus}
            placeholder={
              placeholder ?? (parentId ? t("ui.write_a_reply") : t("post.writeComment"))
            }
            className={cn(
              "max-h-28 min-h-10 w-full resize-none rounded-full border border-border bg-background/50 px-4 py-2.5 text-sm leading-snug focus:outline-none focus:ring-2 focus:ring-primary/40",
              inputClassName,
            )}
          />
        </div>
        {variant === "reels" ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void pickPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-40"
              disabled={!!attach || uploading}
              onClick={() => fileRef.current?.click()}
              aria-label={t("comments.attachPhoto")}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white disabled:opacity-40"
              disabled={!!attach || uploading || submitting}
              onClick={() => {
                setGifQuery("");
                setGifOpen(true);
              }}
              aria-label={t("comments.attachGif")}
            >
              <GfIcon />
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
              aria-label={submitLabel ?? t("star.badge.post")}
            >
              {submitting || uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#6BA3E8]" />
              ) : (
                <Send className={cn("h-4 w-4", canSubmit ? "text-[#6BA3E8]" : "text-white/25")} />
              )}
            </button>
          </>
        ) : (
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {submitLabel ?? t("star.badge.post")}
          </Button>
        )}
      </div>
      {content.trim() && variant !== "reels" ? (
        <p className="px-1 text-[11px] text-muted-foreground">
          {t("ui.enter_to_post_shift_enter_for")}
        </p>
      ) : null}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <GiphyGifPicker
        open={gifOpen}
        initialQuery={gifQuery}
        onClose={() => setGifOpen(false)}
        onPick={(gif) => {
          const picked = {
            mediaType: "GIF" as const,
            mediaUrl: gif.playUrl,
            previewUrl: gif.previewUrl,
            mediaMeta: {
              source: "giphy" as const,
              id: gif.id,
              title: gif.title,
              user: gif.user,
            },
          };
          if (variant === "reels") {
            void submit({ attach: picked, gifOnly: true });
            return;
          }
          setAttach(picked);
          setError("");
        }}
      />
    </form>
  );
}
