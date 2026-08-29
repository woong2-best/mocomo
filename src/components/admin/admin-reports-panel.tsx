"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import type { ReportTargetType } from "@prisma/client";
import { getPendingReports } from "@/actions/admin";
import { AdminReportActions } from "@/components/admin/admin-report-actions";
import { Button } from "@/components/ui/button";
import { Flag, RefreshCw } from "lucide-react";

type PendingReport = Awaited<ReturnType<typeof getPendingReports>>[number];

const REASON_LABELS: Record<string, string> = {
  SPAM: "스팸·광고",
  ABUSE: "욕설·괴롭힘",
  HARASSMENT: "괴롭힘",
  HATE: "혐오 표현",
  VIOLENCE: "폭력",
  FRAUD: "사기·불법 거래",
  PRIVACY: "개인정보",
  COPYRIGHT: "저작권",
  SEXUAL: "음란물",
  IMPERSONATION: "사칭",
  OTHER: "기타",
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  USER: "사용자",
  POST: "게시물",
  COMMENT: "댓글",
  MESSAGE: "메시지",
  USED_LISTING: "중고 매물",
  LIVE_CHANNEL: "라이브 채널",
  LIVE_CHAT: "라이브 채팅",
  STREAM_CLIP: "스트림 클립",
  MARKETPLACE_LISTING: "마켓 상품",
  MARKETPLACE_SELLER: "마켓 판매자",
};

function reportSummary(report: PendingReport): string {
  if (report.post?.title) return report.post.title;
  if (report.post?.content) return report.post.content.slice(0, 120);
  if (report.reportedUser?.username) return `@${report.reportedUser.username}`;
  return report.targetId.slice(0, 12);
}

export function AdminReportsPanel({ initialReports }: { initialReports: PendingReport[] }) {
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => {
      void getPendingReports().then(() => {
        window.location.reload();
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Flag className="h-5 w-5" />
          대기 신고 ({initialReports.length})
        </h2>
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          새로고침
        </Button>
      </div>

      {initialReports.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          현재 대기 중인 신고가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {initialReports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-border/60 bg-card p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-700">
                      {TARGET_LABELS[report.targetType] ?? report.targetType}
                    </span>
                    <span className="text-sm font-medium">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{reportSummary(report)}</p>
                  {report.details && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{report.details}</p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(report.createdAt), "M/d HH:mm", { locale: ko })}
                </time>
              </div>
              <p className="text-xs text-muted-foreground">
                신고자: @{report.reporter.username}
                {report.reportedUser && (
                  <>
                    {" "}
                    · 대상:{" "}
                    <Link
                      href={`/admin/users/${report.reportedUser.id}`}
                      className="text-primary hover:underline"
                    >
                      @{report.reportedUser.username}
                    </Link>
                  </>
                )}
              </p>
              <AdminReportActions
                reportId={report.id}
                targetType={report.targetType}
                targetId={report.targetId}
                reportedUserId={report.reportedUserId ?? report.reportedUser?.id}
                reportedUsername={report.reportedUser?.username}
              />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        위험도 기반 자동 대기열은{" "}
        <Link href="/admin/moderation" className="text-primary hover:underline">
          위험도 · 검토 대기열
        </Link>
        에서 확인하세요. 반복 위반자 정책은{" "}
        <Link href="/legal/moderation" className="text-primary hover:underline" target="_blank">
          공개 운영 정책
        </Link>
        을 참조하세요.
      </p>
    </div>
  );
}
