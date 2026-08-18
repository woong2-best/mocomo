"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Copy,
  Eye,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteOwnPost } from "@/actions/post-delete";
import { ShareGlobeIcon } from "@/components/ui/share-globe-icon";
import { notifyPostDeleted } from "@/lib/post-deleted-sync";
import { postUrl } from "@/lib/post-share";
import { COMMUNITY_FEED_PATH, DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { cn } from "@/lib/utils";
import {
  FLASH_POST_STORAGE_KEY,
  SCROLL_FEED_TOP_KEY,
  type PublishedToastInput,
  type PublishedToastKind,
  type ToastAvatar,
} from "@/lib/published-toast-types";
import { useLocale } from "@/components/providers/locale-provider";
import { pushErrorToast } from "@/lib/published-toast-store";

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

function scrollMainToTop() {
  const main = document.getElementById("mocomo-main-scroll");
  if (main) {
    main.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function PublishedToastPill({
  toast,
  onDismiss,
  onPause,
  onResume,
  onShowInfo,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
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
  const isWarning = toast.kind === "warning";
  const isPublishing = toast.kind === "publishing";
  const isPublished = toast.kind === "published";

  const avatars: ToastAvatar[] =
    toast.avatars && toast.avatars.length > 0
      ? toast.avatars.slice(0, 3)
      : toast.userImage || toast.userName
        ? [{ image: toast.userImage, name: toast.userName }]
        : [];

  function goToPublishedContent() {
    if (isPublishing) return;
    if (isWarning && !toast.href) return;
    onDismiss();

    // DM 공유 등 — 명시 href 우선 (트위터 "대화 보기")
    if (toast.href) {
      router.push(toast.href);
      return;
    }

    if (toast.postId) {
      try {
        sessionStorage.setItem(FLASH_POST_STORAGE_KEY, toast.postId);
        sessionStorage.setItem(SCROLL_FEED_TOP_KEY, "1");
      } catch {
        /* ignore */
      }
    }

    // 상세 href가 명시된 메뉴용 — 본문 클릭은 피드 맨 위
    const onFeed =
      pathname === "/" ||
      pathname === DEFAULT_LANDING_PATH ||
      pathname === COMMUNITY_FEED_PATH ||
      pathname?.startsWith("/feed");

    if (onFeed) {
      scrollMainToTop();
      router.refresh();
      return;
    }

    router.push(DEFAULT_LANDING_PATH);
  }

  function viewPostDetail() {
    if (!toast.postId) return;
    onDismiss();
    try {
      sessionStorage.setItem(FLASH_POST_STORAGE_KEY, toast.postId);
    } catch {
      /* ignore */
    }
    router.push(`/post/${toast.postId}`);
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
      /* cancelled */
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
    const postId = toast.postId;
    setBusy(true);
    setConfirmDelete(false);
    setSheetOpen(false);
    onDismiss();

    notifyPostDeleted(postId);
    onShowInfo({ message: t("toast.deleted") });
    if (pathname?.startsWith("/post/")) {
      router.push(COMMUNITY_FEED_PATH);
    }

    try {
      const res = await deleteOwnPost(postId);
      if (res.error) {
        pushErrorToast({ message: res.error });
        router.refresh();
      }
    } catch {
      pushErrorToast({ message: t("post.menu.deleteFailed") });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const shellClass = cn(
    "relative flex max-w-[min(100vw-1.5rem,380px)] items-center gap-2.5 rounded-full pl-3.5 pr-2 shadow-[0_8px_28px_rgba(27,58,140,0.35)]",
    isWarning ? "h-[56px] shadow-[0_8px_28px_rgba(185,28,28,0.35)]" : "h-[52px]",
    isError || isWarning
      ? "bg-red-600 text-white"
      : "bg-[#1D9BF0] text-white sm:bg-folk-cobalt"
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
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          onClick={goToPublishedContent}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goToPublishedContent();
            }
          }}
          disabled={isPublishing}
          aria-label={
            toast.href && toast.detail
              ? `${toast.message}. ${toast.detail}`
              : toast.postId
                ? `${toast.message}. ${t("toast.viewPost")}`
                : toast.message
          }
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : isError ? (
              <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            ) : isWarning ? (
              <AlertTriangle className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            ) : (
              <Upload className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            )}
          </span>

          {avatars.length > 0 && (
            <span className="flex shrink-0 items-center pl-1">
              {avatars.map((a, i) => (
                <span
                  key={`${a.name ?? "a"}-${i}`}
                  className="relative -ml-2 first:ml-0 h-9 w-9 overflow-hidden rounded-[28%] ring-2 ring-[#1D9BF0] sm:ring-folk-cobalt"
                  style={{ zIndex: avatars.length - i }}
                >
                  {a.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.image}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-white/25 text-xs font-bold">
                      {(a.name ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
              ))}
            </span>
          )}

          <span className="min-w-0 flex-1 pr-1">
            <span className="block truncate text-[15px] font-bold leading-tight tracking-tight">
              {toast.message}
            </span>
            {toast.detail ? (
              <span className="block truncate text-[12px] font-medium text-white/85">
                {toast.detail}
              </span>
            ) : null}
          </span>
        </button>

        {isWarning && toast.href ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-white/80 mr-1" aria-hidden />
        ) : null}

        {toast.showActions && toast.postId && !isPublishing && !isError && !isWarning && (
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
              <DropdownMenuContent align="end" className="z-[330] w-48">
                <DropdownMenuItem onClick={goToPublishedContent}>
                  <Eye className="h-4 w-4" />
                  {t("toast.viewPost")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={viewPostDetail}>
                  <Link2 className="h-4 w-4" />
                  {t("feed.displayMode.openPost")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={editPost}>
                  <Pencil className="h-4 w-4" />
                  {t("toast.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void copyLink()}>
                  <Copy className="h-4 w-4" />
                  {t("toast.copyLink")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void sharePost()}>
                  <ShareGlobeIcon className="h-4 w-4" />
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
        <div className="fixed inset-0 z-[330] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t("toast.cancel")}
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative space-y-1 rounded-t-2xl border-t border-border bg-card p-3 pb-safe animate-in slide-in-from-bottom">
            <ActionRow icon={Eye} label={t("toast.viewPost")} onClick={goToPublishedContent} />
            <ActionRow icon={Link2} label={t("feed.displayMode.openPost")} onClick={viewPostDetail} />
            <ActionRow icon={Pencil} label={t("toast.edit")} onClick={editPost} />
            <ActionRow icon={Copy} label={t("toast.copyLink")} onClick={() => void copyLink()} />
            <ActionRow icon={ShareGlobeIcon} label={t("toast.share")} onClick={() => void sharePost()} />
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
        <div className="fixed inset-0 z-[340] flex items-center justify-center p-4">
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
  icon: React.ComponentType<{ className?: string }>;
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
