"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getCommunityReports, resolveCommunityReport } from "@/actions/community-content";
import { Button } from "@/components/ui/button";

export function CommunityReportsPanel({ communityId }: { communityId: string }) {
  const [reports, setReports] = useState<
    {
      id: string;
      targetType: string;
      targetId: string;
      reason: string;
      createdAt: string;
      reporterUsername: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await getCommunityReports(communityId);
    setReports(res.reports);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [communityId]);

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <h2 className="font-semibold">신고 처리</h2>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">대기 중인 신고가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-lg border p-3 text-sm space-y-2">
              <p className="font-medium">
                {r.targetType} · @{r.reporterUsername}
              </p>
              <p className="text-muted-foreground">{r.reason}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void resolveCommunityReport(r.id, communityId, "DISMISSED").then(load)
                  }
                >
                  기각
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void resolveCommunityReport(r.id, communityId, "RESOLVED").then(load)
                  }
                >
                  처리 완료
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
