"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getCommunityStats, getCommunityAuditLogs } from "@/actions/community-content";

export function CommunityStatsAuditPanel({ communityId }: { communityId: string }) {
  const [stats, setStats] = useState<{
    memberCount: number;
    postCount: number;
    channelCount: number;
    pendingReports: number;
    pendingJoins: number;
  } | null>(null);
  const [logs, setLogs] = useState<
    { id: string; action: string; actorUsername: string; detail: string | null; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [s, l] = await Promise.all([
        getCommunityStats(communityId),
        getCommunityAuditLogs(communityId),
      ]);
      setStats(s.stats);
      setLogs(l.logs);
      setLoading(false);
    })();
  }, [communityId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("community-server.sqecfig")}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {stats && (
        <div className="rounded-xl border border-border p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label={t("lib.community-server.swqlc")} value={stats.memberCount} />
          <Stat label={t("lib.flower.sq7xo0")} value={stats.postCount} />
          <Stat label={t("community-server.szpsc")} value={stats.channelCount} />
          <Stat label={t("community-server.sbkngts")} value={stats.pendingReports} />
          <Stat label={t("lib.notifications.s3e55ce56df")} value={stats.pendingJoins} />
        </div>
      )}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-semibold">{t("lib.community-server.s8h8ftr")}</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("community-server.skoe8ei")}</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex justify-between gap-2 border-b border-border/50 pb-2">
                <span>
                  <strong>@{l.actorUsername}</strong> · {l.action}
                  {l.detail ? ` — ${l.detail}` : ""}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(l.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
