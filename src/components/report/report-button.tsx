"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import type { ReportTargetType } from "@prisma/client";
import {
  submitContentReport,
  REPORT_REASONS,
  type ReportReasonId,
} from "@/actions/report";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ReportButton({
  targetType,
  targetId,
  reportedUserId,
  postId,
  commentId,
  label = "신고",
  variant = "ghost",
  size = "sm",
}: {
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string;
  postId?: string;
  commentId?: string;
  label?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReasonId>("SPAM");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const res = await submitContentReport({
        targetType,
        targetId,
        reason,
        details,
        reportedUserId,
        postId,
        commentId,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(res.message ?? "신고가 접수되었습니다.");
      setDetails("");
      setTimeout(() => {
        setOpen(false);
        setMessage("");
        router.refresh();
      }, 1200);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size={size} className="gap-1.5 text-muted-foreground">
          <Flag className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>콘텐츠 신고</DialogTitle>
          <DialogDescription>
            허위·악의적 신고는 제재 대상이 될 수 있습니다. 운영자가 검토 후 조치합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">신고 사유</p>
            <select
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReasonId)}
            >
              {REPORT_REASONS.map((r) => (
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
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}
          <Button type="button" className="w-full rounded-xl" disabled={pending} onClick={submit}>
            {pending ? "접수 중…" : "신고 제출"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
