"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Eye,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteOwnPost } from "@/actions/post-delete";
import { postUrl } from "@/lib/post-share";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";
import { cn } from "@/lib/utils";
import {
  type PublishedToastInput,
  type PublishedToastKind,
} from "@/lib/published-toast-types";
import { FLASH_POST_STORAGE_KEY } from "@/lib/published-toast-types";
import { useLocale } from "@/components/providers/locale-provider";

type ToastView = PublishedToastInput & {
  id: string;
  kind: PublishedToastKind;
};

type Props = {
  toast: ToastView;
  onDismiss: () => void;
  onPause: () => void;
  onResume: () => void;
  onShowInfo: (input: { message: string; durationMs?: number }) => void;
};

export function PublishedToastPill({
  toast,
  onDismiss,
  onPause,
  onResume,
  onShowInfo,
}: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (menuOpen || sheetOpen || confirmDelete) onPause();
    else onResume();
  }, [menuOpen, sheetOpen, confirmDelete, onPause, onResume]);

  const isError = toast.kind === "error";
  const isPublishing = toast.kind === "publishing";
  const isPublished = toast.kind === "published";

  function goToPost() {
    if (!toast.postId && !toast.href) return;
    onDismiss();
    const href = toast.href ?? `/post/${toast.postId}`;
    if (toast.postId) {
      try {
        sessionStorage.setItem(FLASH_POST_STORAGE_KEY, toast.postId);
      } catch {
        /* ignore */
      }
    }
    router.push(href);
  }

  async function copyLink() {
    if (!toast.postId) return;
    try {
      await navigator.clipboard.writeText(postUrl(toast.postId));
      onShowInfo({ message: t("toast.linkCopied") });
    } catch {
      onShowInfo({ message: t("toast.linkCopied") });
    }
    setMenuOpen(false);
    setSheetOpen(false);
  }

  async function sharePost() {
    if (!toast.postId) return;
    const url = postUrl(toast.postId);
    try {
      if (navigator.share) {
        await navigator.share({ url, title: t("toast.published") });
      } else {
        await navigator.clipboard.writeText(url);
        onShowInfo({ message: t("toast.linkCopied") });
      }
    } catch {
      /* user cancelled share */
    }
    setMenuOpen(false);
    setSheetOpen(false);
  }

  function editPost() {
    setMenuOpen(false);
    setSheetOpen(false);
    onDismiss();
    onShowInfo({ message: t("toast.editSoon") });
    if (toast.postId) router.push(`/post/${toast.postId}`);
  }

  async function confirmDeletePost() {
    if (!toast.postId || busy) return;
    setBusy(true);
    const res = await deleteOwnPost(toast.postId);
    setBusy(false);
    setConfirmDelete(false);
    setSheetOpen(false);
    onDismiss();
    if (res.error) {
      onShowInfo({ message: res.error });
      return;
    }
    onShowInfo({ message: t("toast.deleted") });
    router.refresh();
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/post/")) {
      router.push(COMMUNITY_FEED_PATH);
    }
  }

  const shellClass = cn(
    "relative flex h-14 max-w-[min(100vw-1.5rem,360px)] items-center gap-2.5 rounded-full pl-3.5 pr-2 shadow-lg",
    isError
      ? "bg-red-600 text-white"
      : "bg-folk-cobalt text-white"
  );

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={shellClass}
        onMouseEnter={onPause}
        onMouseLeave={() => {
          if (!menuOpen && !sheetOpen && !confirmDelete) onResume();
        }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full text-left outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          onClick={() => {
            if (isPublishing) return;
            if (toast.href || toast.postId) goToPost();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!isPublishing && (toast.href || toast.postId)) goToPost();
            }
          }}
          disabled={isPublishing}
          aria-label={
            toast.postId
              ? `${toast.message}. ${t("toast.viewPost")}`
              : toast.message
          }
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : isError ? (
              <X className="h-4 w-4" aria-hidden />
            ) : isPublished ? (
              <Upload className="h-4 w-4" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
          </span>

          {(toast.userImage || toast.userName) && (
            <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/25">
              {toast.userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toast.userImage}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white/20 text-sm font-bold text-white">
                  {(toast.userName ?? "?").slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold leading-tight">
              {toast.message}
            </span>
            {toast.detail ? (
              <span className="block truncate text-[12px] font-medium text-white/85">
                {toast.detail}
              </span>
            ) : null}
          </span>
        </button>

        {toast.showActions && toast.postId && !isPublishing && !isError && (
          isNarrow ? (
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/15"
              aria-label={t("toast.more")}
              onClick={(e) => {
                e.stopPropagation();
                setSheetOpen(true);
              }}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          ) : (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/15 outline-none"
                  aria-label={t("toast.more")}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[250] w-48">
                <DropdownMenuItem onClick={goToPost}>
                  <Eye className="h-4 w-4" />
                  {t("toast.viewPost")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={editPost}>
                  <Pencil className="h-4 w-4" />
                  {t("toast.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void copyLink()}>
                  <Link2 className="h-4 w-4" />
                  {t("toast.copyLink")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void sharePost()}>
                  <Share2 className="h-4 w-4" />
                  {t("toast.share")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("toast.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-[250] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t("toast.cancel")}
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative space-y-1 rounded-t-2xl border-t border-border bg-card p-3 pb-safe animate-in slide-in-from-bottom">
            <ActionRow icon={Eye} label={t("toast.viewPost")} onClick={goToPost} />
            <ActionRow icon={Pencil} label={t("toast.edit")} onClick={editPost} />
            <ActionRow
              icon={Copy}
              label={t("toast.copyLink")}
              onClick={() => void copyLink()}
            />
            <ActionRow
              icon={Share2}
              label={t("toast.share")}
              onClick={() => void sharePost()}
            />
            <ActionRow
              icon={Trash2}
              label={t("toast.delete")}
              danger
              onClick={() => {
                setSheetOpen(false);
                setConfirmDelete(true);
              }}
            />
            <button
              type="button"
              className="mt-2 w-full rounded-xl bg-muted py-3 text-sm font-semibold"
              onClick={() => setSheetOpen(false)}
            >
              {t("toast.cancel")}
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={t("toast.cancel")}
            onClick={() => setConfirmDelete(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="toast-delete-title"
            className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl"
          >
            <p id="toast-delete-title" className="text-base font-semibold">
              {t("toast.deleteConfirm")}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-semibold hover:bg-muted/80"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
              >
                {t("toast.cancel")}
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void confirmDeletePost()}
                disabled={busy}
              >
                {busy ? t("common.loading") : t("toast.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-medium hover:bg-muted",
        danger && "text-destructive"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </button>
  );
}
