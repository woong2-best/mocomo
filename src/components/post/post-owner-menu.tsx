"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Ban,
  Flag,
  MoreHorizontal,
  Pin,
  PinOff,
  Rocket,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { PostBoostDialog } from "@/components/post/post-boost-dialog";
import { PostCancelBoostDialog } from "@/components/post/post-cancel-boost-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteOwnPost } from "@/actions/post-delete";
import {
  featurePostOnMyProfile,
  pinPostToProfile,
  unfeaturePostFromMyProfile,
  unpinPostFromProfile,
} from "@/actions/post-pin";
import { blockUserAction, toggleMuteUserAction } from "@/actions/user-relationship";
import { ContentReportFlow } from "@/components/report/content-report-flow";
import { useLocale } from "@/components/providers/locale-provider";
import { usePublishedToastOptional } from "@/components/providers/published-toast-provider";
import { notifyPostDeleted } from "@/lib/post-deleted-sync";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  isPinned?: boolean;
  /** @deprecated ignored — menu shows for owners and logged-in viewers */
  showOnlyForOwner?: boolean;
  isOwner?: boolean;
  authorId?: string;
  authorUsername?: string;
  anonymous?: boolean;
  /** QnA/community posts: hide pin-on-profile & Quiet for other users' posts */
  qna?: boolean;
  /** Owner photo posts can be boosted */
  canBoost?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function PostOwnerMenu({
  postId,
  isPinned = false,
  isOwner = false,
  authorId,
  authorUsername,
  anonymous = false,
  qna = false,
  canBoost = false,
  size = "sm",
  className,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const { t } = useLocale();
  const publishedToast = usePublishedToastOptional();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(isPinned);
  const [featured, setFeatured] = useState(false);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    setPinned(isPinned);
  }, [isPinned]);

  useEffect(() => {
    if (!open || !isOwner || !canBoost) return;
    let cancelled = false;
    void fetch(`/api/ads/boost?postId=${encodeURIComponent(postId)}`, { credentials: "same-origin" })
      .then(async (res) => {
        const body = await res.json();
        if (!cancelled && res.ok) setBoostActive(!!body.active);
      })
      .catch(() => {
        /* keep last known */
      });
    return () => {
      cancelled = true;
    };
  }, [open, isOwner, canBoost, postId]);
  const [busy, setBusy] = useState<"pin" | "delete" | "block" | "feature" | "mute" | null>(null);
  const [error, setError] = useState("");
  const [reportOnlyOpen, setReportOnlyOpen] = useState(false);
  const [boostActive, setBoostActive] = useState(false);
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const loggedIn = !!session?.data?.user;
  const canShowOtherMenu = !isOwner && loggedIn && !!authorId && !!authorUsername;
  const canReportAnonymous = !isOwner && loggedIn && !authorId;

  if (!isOwner && !canShowOtherMenu && !canReportAnonymous) return null;

  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const btnSize = size === "md" ? "h-9 w-9" : "h-8 w-8";

  async function togglePin() {
    if (busy) return;
    setBusy("pin");
    setError("");
    try {
      const res = pinned ? await unpinPostFromProfile(postId) : await pinPostToProfile(postId);
      if (res.error) {
        setError(errorText(res.error));
        return;
      }
      setPinned(!pinned);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleFeatureOnMyProfile() {
    if (busy) return;
    setBusy("feature");
    setError("");
    try {
      const res = featured
        ? await unfeaturePostFromMyProfile(postId)
        : await featurePostOnMyProfile(postId);
      if (res.error) {
        setError(errorText(res.error));
        return;
      }
      setFeatured(!featured);
      setOpen(false);
      publishedToast?.showInfoToast({
        message: featured ? t("post.menu.unfeaturedToast") : t("post.menu.featuredToast"),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleMute() {
    if (busy || !authorId || !authorUsername) return;
    setBusy("mute");
    setError("");
    try {
      const res = await toggleMuteUserAction(authorId, authorUsername);
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        return;
      }
      setMuted(!!res.muted);
      setOpen(false);
      publishedToast?.showInfoToast({
        message: res.muted ? t("post.menu.mutedToast") : t("post.menu.unmutedToast"),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function openReportOnly() {
    setOpen(false);
    setReportOnlyOpen(true);
  }

  async function handleBlock() {
    if (busy || !authorId || !authorUsername) return;
    setBusy("block");
    setError("");
    setOpen(false);
    try {
      const res = await blockUserAction(authorId, authorUsername);
      if (res.error) {
        setError(errorText(res.error));
        publishedToast?.showErrorToast({ message: errorText(res.error) });
        return;
      }
      publishedToast?.showInfoToast({ message: t("post.menu.blockDone") });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (busy) return;
    if (!window.confirm(t("post.menu.deleteConfirm"))) return;

    setBusy("delete");
    setError("");
    setOpen(false);

    notifyPostDeleted(postId);
    publishedToast?.showInfoToast({ message: t("toast.deleted") });
    if (pathname?.startsWith("/post/")) {
      router.push(COMMUNITY_FEED_PATH);
    }

    try {
      const res = await deleteOwnPost(postId);
      if (res.error) {
        publishedToast?.showErrorToast({ message: errorText(res.error) });
        setError(errorText(res.error));
        router.refresh();
        return;
      }
    } catch {
      publishedToast?.showErrorToast({ message: t("post.menu.deleteFailed") });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen} modal>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("post.menu.ariaLabel")}
            className={cn(
              "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
              btnSize
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className={iconSize} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
          {isOwner && (
            <>
              {canBoost ? (
                <>
                  <DropdownMenuItem
                    disabled={busy !== null}
                    onSelect={(e) => {
                      e.preventDefault();
                      setOpen(false);
                      if (boostActive) setCancelDialogOpen(true);
                      else setBoostDialogOpen(true);
                    }}
                  >
                    <Rocket className="h-4 w-4" />
                    {boostActive ? t("post.menu.cancelBoost") : t("post.menu.boost")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem
                disabled={busy !== null}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onSelect={(e) => {
                  e.preventDefault();
                  void handleDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t("post.menu.delete")}
              </DropdownMenuItem>
              {!anonymous ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={busy !== null}
                    onSelect={(e) => {
                      e.preventDefault();
                      void togglePin();
                    }}
                  >
                    {pinned ? (
                      <>
                        <PinOff className="h-4 w-4" />
                        {t("post.menu.unpinFromProfile")}
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4" />
                        {t("post.menu.pinToProfile")}
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              ) : null}
            </>
          )}

          {canReportAnonymous && (
            <DropdownMenuItem
              disabled={busy !== null}
              onSelect={(e) => {
                e.preventDefault();
                openReportOnly();
              }}
            >
              <Flag className="h-4 w-4" />
              {t("post.menu.report")}
            </DropdownMenuItem>
          )}

          {canShowOtherMenu && (
            <>
              {!qna ? (
                <>
                  <DropdownMenuItem
                    disabled={busy !== null}
                    onSelect={(e) => {
                      e.preventDefault();
                      void toggleFeatureOnMyProfile();
                    }}
                  >
                    {featured ? (
                      <>
                        <PinOff className="h-4 w-4" />
                        {t("post.menu.unpinFromProfile")}
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4" />
                        {t("post.menu.pinToProfile")}
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={busy !== null}
                    onSelect={(e) => {
                      e.preventDefault();
                      void handleMute();
                    }}
                  >
                    {muted ? (
                      <>
                        <VolumeX className="h-4 w-4" />
                        {t("post.menu.unmute")}
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4" />
                        {t("post.menu.mute")}
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem
                disabled={busy !== null}
                onSelect={(e) => {
                  e.preventDefault();
                  openReportOnly();
                }}
              >
                <Flag className="h-4 w-4" />
                {t("post.menu.report")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={busy !== null}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onSelect={(e) => {
                  e.preventDefault();
                  void handleBlock();
                }}
              >
                <Ban className="h-4 w-4" />
                {t("post.menu.block")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="absolute top-full right-0 mt-1 text-[10px] text-destructive whitespace-nowrap">
          {error}
        </p>
      )}

      {canShowOtherMenu || canReportAnonymous ? (
        <>
          <ContentReportFlow
            open={reportOnlyOpen}
            onOpenChange={setReportOnlyOpen}
            targetType="POST"
            targetId={postId}
            postId={postId}
            reportedUserId={authorId}
          />
        </>
      ) : null}

      {isOwner && canBoost ? (
        <>
          <PostBoostDialog
            open={boostDialogOpen}
            onOpenChange={setBoostDialogOpen}
            postId={postId}
            onBoosted={() => setBoostActive(true)}
          />
          <PostCancelBoostDialog
            open={cancelDialogOpen}
            onOpenChange={setCancelDialogOpen}
            postId={postId}
            onCancelled={() => setBoostActive(false)}
          />
        </>
      ) : null}
    </div>
  );
}
