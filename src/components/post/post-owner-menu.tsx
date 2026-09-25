"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Ban,
  Flag,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  VolumeX,
  Volume2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
  const [busy, setBusy] = useState<"pin" | "delete" | "feature" | "mute" | null>(null);
  const [error, setError] = useState("");
  const [reportOnlyOpen, setReportOnlyOpen] = useState(false);
  const [blockReportOpen, setBlockReportOpen] = useState(false);

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
        setError(res.error);
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
        setError(res.error);
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
        setError(res.error);
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

  function openBlockAndReport() {
    setOpen(false);
    setBlockReportOpen(true);
  }

  async function afterBlockReportSubmitted() {
    if (!authorId || !authorUsername) return;
    await blockUserAction(authorId, authorUsername);
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
        publishedToast?.showErrorToast({ message: res.error });
        setError(res.error);
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
              신고
            </DropdownMenuItem>
          )}

          {canShowOtherMenu && (
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
                    <Volume2 className="h-4 w-4" />
                    {t("post.menu.unmute")}
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4" />
                    {t("post.menu.mute")}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={busy !== null}
                onSelect={(e) => {
                  e.preventDefault();
                  openReportOnly();
                }}
              >
                <Flag className="h-4 w-4" />
                신고
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={busy !== null}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onSelect={(e) => {
                  e.preventDefault();
                  openBlockAndReport();
                }}
              >
                <Ban className="h-4 w-4" />
                {t("post.menu.blockAndReport")}
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
          {canShowOtherMenu ? (
            <ContentReportFlow
              open={blockReportOpen}
              onOpenChange={setBlockReportOpen}
              targetType="POST"
              targetId={postId}
              postId={postId}
              reportedUserId={authorId}
              onSubmitted={afterBlockReportSubmitted}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
