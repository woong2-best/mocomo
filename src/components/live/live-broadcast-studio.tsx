"use client";

import { LiveObsStudio } from "@/components/live/live-obs-studio";
import { Monitor } from "lucide-react";

/** 호스트 송출 — OBS + SRS RTMP (LiveKit 없음) */
export function LiveBroadcastStudio({
  channelId,
  onEndStream,
}: {
  channelId: string;
  onEndStream: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
        <Monitor className="h-4 w-4" />
        <span>
          <strong className="text-foreground">OBS</strong>로 송출 → 시청자는 HLS (3~10초 지연)
        </span>
      </div>
      <LiveObsStudio channelId={channelId} onEndStream={onEndStream} />
    </div>
  );
}
