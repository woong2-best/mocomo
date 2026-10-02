"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
  SPAM: t("lib.report.reasons.sf17adeb45b"),
  ABUSE: t("lib.report.reasons.s3645e9834b"),
  HARASSMENT: t("lib.report.reasons.sb84a441368"),
  HATE: t("lib.report.reasons.sc239878d41"),
  VIOLENCE: t("lib.report.reasons.sd82ae088e8"),
  FRAUD: t("lib.report.reasons.s93743c40f1"),
  PRIVACY: t("lib.report.reasons.sd629d0b2e0"),
  COPYRIGHT: t("lib.report.reasons.sc7038aeb72"),
  SEXUAL: t("lib.marketplace.su34lk"),
  IMPERSONATION: t("lib.report.reasons.scde9c0bab2"),
  OTHER: t("lib.webtoon.surv4"),
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  USER: t("admin.st6u9f"),
  POST: t("lib.post.share.s0131626e0e"),
  COMMENT: t("lib.notifications.s6d4e9bd3a9"),
  MESSAGE: t("lib.chat.message.normalize.s96330a61aa"),
  CHAT_ROOM: t("admin.suy0i0"),
  USED_LISTING: t("admin.sqnl6zt"),
  LIVE_CHANNEL: t("admin.stuql3s"),
  LIVE_CHAT: t("admin.stuqrt9"),
  STREAM_CLIP: t("admin.s4zcksh"),
  MARKETPLACE_LISTING: t("admin.s168hwbg"),
  MARKETPLACE_SELLER: t("admin.sutyy1z"),
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
