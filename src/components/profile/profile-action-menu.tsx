"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Ban, Check, Flag, Link2, MoreHorizontal, VolumeX, Volume2, X } from "lucide-react";
import {
  blockUserAction,
  toggleMuteUserAction,
  unblockUserAction,
} from "@/actions/user-relationship";
import { submitContentReport } from "@/actions/report";
import { REPORT_REASONS, type ReportReasonId } from "@/lib/report-reasons";
import { ensureArray } from "@/lib/ensure-array";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  username: string;
  initialBlocked?: boolean;
  initialMuted?: boolean;
  className?: string;
};

type MenuAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
  run: () => void | Promise<void>;
};

export function ProfileActionMenu({
  userId,
  username,
  initialBlocked = false,
  initialMuted = false,
  className,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [muted, setMuted] = useState(initialMuted);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [reportReason, setReportReason] = useState<ReportReasonId>("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportError, setReportError] = useState("");
  const [pending, startTransition] = useTransition();
  const [reportPending, startReportTransition] = useTransition();

  useEffect(() => {
    if (menuOpen) setMuted(initialMuted);
  }, [initialMuted, menuOpen]);

  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/u/${username}`
      : `/u/${username}`;

  async function copyProfileLink() {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/u/${username}`
          : profileUrl;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      setMenuOpen(false);
    } catch {
      setError(t("share.srsq7vp"));
    }
  }

  function toggleMute() {
    setError("");
    startTransition(async () => {
      const res = await toggleMuteUserAction(userId, username);
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        return;
      }
      setMuted(!!res.muted);
      setMenuOpen(false);
      router.refresh();
    });
  }

  function runBlock() {
    setError("");
    startTransition(async () => {
      const res = await blockUserAction(userId, username);
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        return;
      }
      setBlocked(true);
      setMenuOpen(false);
      router.refresh();
    });
  }

  function confirmUnblock() {
    setError("");
    startTransition(async () => {
      await unblockUserAction(userId, username);
      setBlocked(false);
      setMenuOpen(false);
      router.refresh();
    });
  }

  function submitReport() {
    setReportError("");
    setReportMessage("");
    startReportTransition(async () => {
      const res = await submitContentReport({
        targetType: "USER",
        targetId: userId,
        reason: reportReason,
        details: reportDetails,
        reportedUserId: userId,
      });
      if (res.error) {
        setReportError(errorText(res.error));
        return;
      }
      setReportMessage(res.message ?? t("reels.s1xj77n8"));
      setReportDetails("");
      window.setTimeout(() => {
        setReportOpen(false);
        setMenuOpen(false);
        setReportMessage("");
        router.refresh();
      }, 1200);
    });
  }

  const menuActions: MenuAction[] = [
    {
      key: "copy",
      label: copied ? t("share.swp53h8") : t("profile.s1idetbk"),
      icon: copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />,
      run: copyProfileLink,
    },
    {
      key: "mute",
      label: muted ? "Unquiet" : "Quiet",
      icon: muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />,
      run: toggleMute,
    },
    {
      key: "block",
      label: blocked ? `@${username} 님 차단 해제` : `@${username} 님 차단하기`,
      icon: <Ban className="h-4 w-4" />,
      destructive: !blocked,
      run: () => {
        if (blocked) {
          setMenuOpen(false);
          void confirmUnblock();
          return;
        }
        void runBlock();
      },
    },
    {
      key: "report",
      label: `@${username} 님 신고하기`,
      icon: <Flag className="h-4 w-4" />,
      destructive: true,
      run: () => {
        setMenuOpen(false);
        setReportOpen(true);
      },
    },
  ];

  return (
    <>
      <button
        type="button"
        aria-label={t("profile.s1ohyvo")}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors",
          className
        )}
        onClick={() => setMenuOpen(true)}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPortal>
          <DialogOverlay className="z-[200]" />
          <DialogPrimitive.Content
            className={cn(
              "fixed z-[201] w-[min(100vw-1.5rem,22rem)] outline-none",
              "left-1/2 bottom-4 -translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
              "rounded-2xl border border-border bg-background shadow-2xl p-0 overflow-hidden",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <DialogTitle className="text-sm font-bold">{t("profile.s1ok2k7")}</DialogTitle>
              <DialogPrimitive.Close
                type="button"
                className="rounded-full p-1.5 hover:bg-muted/80"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
            <ul className="p-1.5">
              {menuActions.map((action) => (
                <li key={action.key}>
                  <button
                    type="button"
                    disabled={pending && (action.key === "mute" || action.key === "block")}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] font-medium transition-colors",
                      "hover:bg-muted/80 active:bg-muted",
                      action.destructive && "text-destructive hover:bg-destructive/10"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      void action.run();
                    }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60">
                      {action.icon}
                    </span>
                    <span className="min-w-0">{action.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            {error && <p className="px-4 pb-3 text-sm text-destructive">{error}</p>}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>@{username} 님 신고하기</DialogTitle>
            <DialogDescription>
              허위·악의적 신고는 제재 대상이 될 수 있습니다. 운영자가 검토 후 조치합니다.
            </DialogDescription>
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
              className="w-full rounded-xl"
              disabled={reportPending}
              onClick={submitReport}
            >
              {reportPending ? t("profile.spf824u") : t("report.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
