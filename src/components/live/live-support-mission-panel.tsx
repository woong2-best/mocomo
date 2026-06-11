"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveSupportMissionPayload } from "@/lib/live-support/types";
import { resolveLiveMission } from "@/hooks/use-live-support-socket";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  ACCEPTED: "진행 중",
  COMPLETED: "성공",
  FAILED: "실패",
  CANCELLED: "취소",
};

export function LiveSupportMissionPanel({
  channelId,
  isHost,
  socket,
  missions,
  onMission,
  currentUserId,
}: {
  channelId: string;
  isHost: boolean;
  socket: Socket | null;
  missions: LiveSupportMissionPayload[];
  onMission: (m: LiveSupportMissionPayload) => void;
  currentUserId?: string;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/live/${channelId}/support/missions`, { credentials: "include" });
        const body = await res.json();
        if (cancelled || !res.ok || !body.ok) return;
        for (const m of body.missions ?? []) onMission(m);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId, onMission]);

  const active = missions.filter((m) => m.status !== "CANCELLED" && m.status !== "COMPLETED" && m.status !== "FAILED");

  if (active.length === 0) return null;

  async function resolve(id: string, status: "ACCEPTED" | "COMPLETED" | "FAILED" | "CANCELLED") {
    setLoadingId(id);
    const res = await resolveLiveMission(socket, id, status);
    setLoadingId(null);
    if (res.ok && res.mission) onMission(res.mission);
  }

  return (
    <div className="rounded-lg border bg-card/95 backdrop-blur p-3 space-y-2 max-h-48 overflow-y-auto">
      <p className="text-xs font-semibold text-muted-foreground">미션 후원</p>
      {active.map((m) => (
        <div key={m.id} className="flex flex-col gap-1.5 text-sm border-b border-border/60 pb-2 last:border-0 last:pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium truncate">{m.title}</p>
              <p className="text-xs text-muted-foreground">
                {m.username} · {m.rewardAmount.toLocaleString()} CP ·{" "}
                <span className={cn(m.status === "ACCEPTED" && "text-primary")}>{STATUS_LABEL[m.status] ?? m.status}</span>
              </p>
            </div>
          </div>
          {isHost && m.status === "PENDING" && (
            <div className="flex gap-1">
              <Button size="sm" variant="default" className="h-7 text-xs" disabled={loadingId === m.id} onClick={() => void resolve(m.id, "ACCEPTED")}>
                {loadingId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} 수락
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={loadingId === m.id} onClick={() => void resolve(m.id, "FAILED")}>
                거절
              </Button>
            </div>
          )}
          {isHost && m.status === "ACCEPTED" && (
            <div className="flex gap-1">
              <Button size="sm" variant="default" className="h-7 text-xs" disabled={loadingId === m.id} onClick={() => void resolve(m.id, "COMPLETED")}>
                성공
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={loadingId === m.id} onClick={() => void resolve(m.id, "FAILED")}>
                실패
              </Button>
            </div>
          )}
          {!isHost && currentUserId === m.senderId && m.status === "PENDING" && (
            <Button size="sm" variant="ghost" className="h-7 text-xs self-start" disabled={loadingId === m.id} onClick={() => void resolve(m.id, "CANCELLED")}>
              <X className="h-3 w-3 mr-1" /> 취소
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
