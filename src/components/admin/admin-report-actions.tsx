"use client";

import Link from "next/link";
import { useTransition } from "react";
import { resolveReport, banUser, adminForceDeleteByReport } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { ReportStatus, type ReportTargetType } from "@prisma/client";
import { ExternalLink, Trash2 } from "lucide-react";

function targetHref(
  targetType: ReportTargetType,
  targetId: string,
  reportedUsername?: string | null
): string | null {
  if (targetType === "POST") return `/post/${targetId}`;
  if (targetType === "USED_LISTING") return `/used/${targetId}`;
  if (targetType === "USER" && reportedUsername) return `/u/${reportedUsername}`;
  return null;
}

export function AdminReportActions({
  reportId,
  targetType,
  targetId,
  reportedUserId,
  reportedUsername,
}: {
  reportId: string;
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string | null;
  reportedUsername?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const href = targetHref(targetType, targetId, reportedUsername);
  const canDelete = targetType === "POST" || targetType === "USED_LISTING";

  function resolve(status: ReportStatus) {
    startTransition(() => {
      void resolveReport(reportId, status);
    });
  }

  function forceDelete() {
    if (!confirm("신고된 콘텐츠를 강제 삭제하고 신고를 해결 처리할까요?")) return;
    startTransition(() => {
      void adminForceDeleteByReport(reportId, targetType, targetId);
    });
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {href && (
        <Button size="sm" variant="secondary" asChild>
          <Link href={href} target="_blank" className="gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            콘텐츠 보기
          </Link>
        </Button>
      )}
      {canDelete && (
        <Button size="sm" variant="destructive" disabled={pending} onClick={forceDelete} className="gap-1">
          <Trash2 className="h-3.5 w-3.5" />
          강제 삭제
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={pending} onClick={() => resolve("RESOLVED")}>
        해결
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => resolve("DISMISSED")}>
        기각
      </Button>
      {reportedUserId && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void banUser(reportedUserId, "관리자 조치 (신고)");
            })
          }
        >
          유저 정지
        </Button>
      )}
    </div>
  );
}
