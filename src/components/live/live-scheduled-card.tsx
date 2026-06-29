"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Radio } from "lucide-react";
import { startScheduledLiveStream } from "@/actions/live-stream";
import { Button } from "@/components/ui/button";
import { LiveModeBadge } from "@/components/live/live-mode-badge";
import { liveCategoryLabel } from "@/lib/live-categories";
import type { LiveBroadcastMode, LiveStreamCategory } from "@prisma/client";

export function LiveScheduledCard({
  id,
  name,
  scheduledAt,
  category,
  broadcastMode,
  isOwner,
}: {
  id: string;
  name: string;
  scheduledAt: Date;
  category: LiveStreamCategory;
  broadcastMode?: LiveBroadcastMode | string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function goLive() {
    setError("");
    startTransition(async () => {
      const res = await startScheduledLiveStream(id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (res.joinPassword) {
        sessionStorage.setItem(`mocomo_live_pw_${id}`, res.joinPassword);
      }
      router.push(`/voice/${id}`);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <p className="font-semibold text-sm line-clamp-2">{name}</p>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5" />
        {new Date(scheduledAt).toLocaleString("ko-KR")}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <LiveModeBadge broadcastMode={broadcastMode} compact />
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{liveCategoryLabel(category)}</span>
      </div>
      {error ? (
        <p className="text-xs text-destructive mt-2" role="alert">
          {error}
        </p>
      ) : null}
      {isOwner ? (
        <Button size="sm" className="w-full rounded-xl gap-1 mt-2" onClick={goLive} disabled={pending}>
          <Radio className="h-3.5 w-3.5" />
          {pending ? "여는 중…" : "스튜디오 열기"}
        </Button>
      ) : (
        <p className="text-[10px] text-muted-foreground">예약 방송 · 시작 대기</p>
      )}
    </div>
  );
}
