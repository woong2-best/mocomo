"use client";

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
        통계 로딩…
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {stats && (
        <div className="rounded-xl border border-border p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="멤버" value={stats.memberCount} />
          <Stat label="게시글" value={stats.postCount} />
          <Stat label="채널" value={stats.channelCount} />
          <Stat label="대기 신고" value={stats.pendingReports} />
          <Stat label="가입 요청" value={stats.pendingJoins} />
        </div>
      )}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <h2 className="font-semibold">활동 로그</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
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
