"use client";

import { useState, useTransition } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteOwnPost } from "@/actions/post-delete";
import {
  featurePostOnMyProfile,
  pinPostToProfile,
  unfeaturePostFromMyProfile,
  unpinPostFromProfile,
} from "@/actions/post-pin";
import { blockUserAction, toggleMuteUserAction } from "@/actions/user-relationship";
import { submitContentReport } from "@/actions/report";
import { REPORT_REASONS, type ReportReasonId } from "@/lib/report-reasons";
import { ensureArray } from "@/lib/ensure-array";
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
  size?: "sm" | "md";
  className?: string;
};

export function PostOwnerMenu({
  postId,
  isPinned = false,
  isOwner = false,
  authorId,
  authorUsername,
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
  const [blockReportOpen, setBlockReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReasonId>("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportPending, startReportTransition] = useTransition();

  const loggedIn = !!session?.data?.user;
  const canShowOtherMenu = !isOwner && loggedIn && !!authorId && !!authorUsername;

  if (!isOwner && !canShowOtherMenu) return null;

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

  function openBlockAndReport() {
    setOpen(false);
    setReportError("");
    setReportMessage("");
    setBlockReportOpen(true);
  }

  function submitBlockAndReport() {
    if (!authorId || !authorUsername) return;
    setReportError("");
    setReportMessage("");
    startReportTransition(async () => {
      const reportRes = await submitContentReport({
        targetType: "POST",
        targetId: postId,
        reason: reportReason,
        details: reportDetails,
        reportedUserId: authorId,
        postId,
      });
      if (reportRes.error) {
        setReportError(reportRes.error);
        return;
      }

      const blockRes = await blockUserAction(authorId, authorUsername);
      if ("error" in blockRes && blockRes.error) {
        setReportError(blockRes.error);
        return;
      }

      setReportMessage(t("post.menu.blockReportDone"));
      setReportDetails("");
      window.setTimeout(() => {
        setBlockReportOpen(false);
        setReportMessage("");
        router.refresh();
      }, 1200);
    });
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
                disabled={busy !== null || reportPending}
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

      <Dialog open={blockReportOpen} onOpenChange={setBlockReportOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("post.menu.blockAndReport")}</DialogTitle>
            <DialogDescription>{t("post.menu.blockAndReportDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t("post.menu.reportReason")}</p>
              <select
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as ReportReasonId)}
              >
                {ensureArray<{ id: ReportReasonId; label: string }>(REPORT_REASONS).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">{t("post.menu.reportDetails")}</p>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-border p-3 text-sm"
                placeholder={t("post.menu.reportDetailsPlaceholder")}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                maxLength={500}
              />
            </div>
            {reportError && <p className="text-sm text-destructive">{reportError}</p>}
            {reportMessage && <p className="text-sm text-primary">{reportMessage}</p>}
            <Button
              type="button"
              variant="destructive"
              className="w-full rounded-xl gap-1.5"
              disabled={reportPending}
              onClick={submitBlockAndReport}
            >
              <Flag className="h-4 w-4" />
              {reportPending ? t("post.menu.blockReportSubmitting") : t("post.menu.blockAndReport")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
