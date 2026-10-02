"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { useTransition } from "react";
import { resolveReport, suspendUserPermanently, adminForceDeleteByReport } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { InlineConfirm } from "@/components/ui/inline-confirm";
import { ReportStatus, type ReportTargetType } from "@prisma/client";
import { ExternalLink, Trash2 } from "lucide-react";

function targetHref(
  targetType: ReportTargetType,
  targetId: string,
  reportedUsername?: string | null,
  reportId?: string
): string | null {
  if (targetType === "POST") return `/post/${targetId}`;
  if (targetType === "USED_LISTING") return `/market/${targetId}`;
  if (targetType === "USER" && reportedUsername) return `/u/${reportedUsername}`;
  if (targetType === "CHAT_ROOM" && reportId) return `/admin/reports/chat/${reportId}`;
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
  const href = targetHref(targetType, targetId, reportedUsername, reportId);
  const canDelete = targetType === "POST" || targetType === "USED_LISTING";

  function resolve(status: ReportStatus) {
    startTransition(() => {
      void resolveReport(reportId, status);
    });
  }

  function forceDelete() {
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
        <InlineConfirm
          message={t("admin.s18lpi2b")}
          confirmLabel={t("moderation.s1mtowtk")}
          pending={pending}
          onConfirm={forceDelete}
          renderTrigger={(open) => (
            <Button size="sm" variant="destructive" disabled={pending} onClick={open} className="gap-1">
              <Trash2 className="h-3.5 w-3.5" />
              강제 삭제
            </Button>
          )}
        />
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
              void suspendUserPermanently(reportedUserId, t("admin.s94wnov"));
            })
          }
        >
          유저 영구 정지
        </Button>
      )}
    </div>
  );
}
