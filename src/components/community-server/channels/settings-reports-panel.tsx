"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
      <h2 className="font-semibold">{t("lib.community-server.s2g6gqc")}</h2>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("community-server.sopnlru")}</p>
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
                  {t("lib.account.status.s804c263a67")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void resolveCommunityReport(r.id, communityId, "RESOLVED").then(load)
                  }
                >
                  {t("community-server.s1629b4k")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
