"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Sticker } from "lucide-react";
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
import { TenorGifPicker } from "@/components/post/tenor-gif-picker";

type Attach = { mediaType: "PHOTO" | "GIF"; mediaUrl: string; previewUrl: string };

export function CommentForm({
  postId,
  parentId,
  placeholder,
  submitLabel,
  className,
  inputClassName,
  autoFocus,
  onSubmitted,
}: {
  postId: string;
  parentId?: string;
  placeholder?: string;
  submitLabel?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
}) {
  const { t } = useLocale();
  const [content, setContent] = useState("");
  const [attach, setAttach] = useState<Attach | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const session = useSession();
  const user = session?.data?.user;
  const canSubmit = Boolean((content.trim() || attach) && user && !submitting && !uploading);

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

  async function submit() {
    const text = content.trim();
    if ((!text && !attach) || !user || submitting || uploading) return;
    if (attach?.mediaType === "PHOTO" && attach.mediaUrl.startsWith("blob:")) return;

    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setContent("");
    const sent = attach;
    setAttach(null);
    setError("");
    setSubmitting(true);

    notifyCommentAdded(postId, {
      id: pendingId,
      content: text,
      parentId,
      pending: true,
      mediaType: sent?.mediaType ?? "NONE",
      mediaUrl: sent?.mediaUrl ?? null,
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
          mediaType: sent?.mediaType ?? "NONE",
          mediaUrl: sent?.mediaUrl ?? null,
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
      onSubmitted?.();
      router.refresh();
    } catch (err) {
      notifyCommentFailed(postId, pendingId);
      setContent(text);
      setAttach(sent);
      setError(err instanceof Error ? err.message : t("ui.couldn_t_post_comment"));
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
      {attach ? (
        <CommentAttachPreview
          url={attach.previewUrl}
          gif={attach.mediaType === "GIF"}
          onClear={() => {
            if (!uploading) setAttach(null);
          }}
        />
      ) : null}
      <div className="flex items-end gap-2">
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
            onClick={() => setGifOpen(true)}
            aria-label={t("comments.attachGif")}
          >
            <Sticker className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          autoFocus={autoFocus}
          placeholder={
            placeholder ?? (parentId ? t("ui.write_a_reply") : t("post.writeComment"))
          }
          className={cn(
            "max-h-28 min-h-10 flex-1 resize-none rounded-full border border-border bg-background/50 px-4 py-2.5 text-sm leading-snug focus:outline-none focus:ring-2 focus:ring-primary/40",
            inputClassName,
          )}
        />
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {submitLabel ?? t("star.badge.post")}
        </Button>
      </div>
      {content.trim() ? (
        <p className="px-1 text-[11px] text-muted-foreground">
          {t("ui.enter_to_post_shift_enter_for")}
        </p>
      ) : null}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <TenorGifPicker
        open={gifOpen}
        onClose={() => setGifOpen(false)}
        onPick={(gif) => {
          setAttach({ mediaType: "GIF", mediaUrl: gif.playUrl, previewUrl: gif.previewUrl });
          setError("");
        }}
      />
    </form>
  );
}
