"use client";

import { useState, useTransition } from "react";
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
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
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
      setError("링크 복사에 실패했습니다.");
    }
  }

  function toggleMute() {
    setError("");
    startTransition(async () => {
      const res = await toggleMuteUserAction(userId, username);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setMuted(!!res.muted);
      setMenuOpen(false);
      router.refresh();
    });
  }

  function confirmBlock() {
    setError("");
    startTransition(async () => {
      const res = await blockUserAction(userId, username);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setBlocked(true);
      setBlockDialogOpen(false);
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
        setReportError(res.error);
        return;
      }
      setReportMessage(res.message ?? "신고가 접수되었습니다.");
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
      label: copied ? "링크 복사됨" : "프로필 링크 복사하기",
      icon: copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />,
      run: copyProfileLink,
    },
    {
      key: "mute",
      label: muted ? "뮤트 해제" : "뮤트",
      icon: muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />,
      run: toggleMute,
    },
    {
      key: "block",
      label: blocked ? `@${username} 님 차단 해제` : `@${username} 님 차단하기`,
      icon: <Ban className="h-4 w-4" />,
      destructive: !blocked,
      run: () => {
        setMenuOpen(false);
        if (blocked) {
          void confirmUnblock();
          return;
        }
        setBlockDialogOpen(true);
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
        aria-label="프로필 메뉴"
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
              <DialogTitle className="text-sm font-bold">프로필 옵션</DialogTitle>
              <DialogPrimitive.Close
                type="button"
                className="rounded-full p-1.5 hover:bg-muted/80"
                aria-label="닫기"
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

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>@{username} 님을 차단할까요?</DialogTitle>
            <DialogDescription>
              차단하면 서로 팔로우할 수 없고, 상대방의 게시물과 알림이 표시되지 않습니다. 언제든
              차단을 해제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={pending}
              onClick={() => setBlockDialogOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={pending}
              onClick={confirmBlock}
            >
              {pending ? "처리 중…" : "차단하기"}
            </Button>
          </div>
        </DialogContent>
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
              <p className="text-sm font-medium">신고 사유</p>
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
              <p className="text-sm font-medium">추가 설명 (선택)</p>
              <textarea
                className="w-full min-h-[80px] rounded-xl border border-border p-3 text-sm"
                placeholder="상세 내용을 적어 주세요"
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
              {reportPending ? "접수 중…" : "신고 제출"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
