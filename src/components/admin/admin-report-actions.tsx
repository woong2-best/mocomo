"use client";

import { useTransition } from "react";
import { resolveReport, banUser } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { ReportStatus } from "@prisma/client";

export function AdminReportActions({
  reportId,
  reportedUserId,
}: {
  reportId: string;
  reportedUserId?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function resolve(status: ReportStatus) {
    startTransition(() => {
      void resolveReport(reportId, status);
    });
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => resolve("RESOLVED")}>
        해결
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => resolve("DISMISSED")}>
        기각
      </Button>
      {reportedUserId && (
        <Button
          size="sm"
          variant="destructive"
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
