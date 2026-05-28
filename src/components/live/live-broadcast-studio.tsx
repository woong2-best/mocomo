"use client";

import { LiveObsStudio } from "@/components/live/live-obs-studio";
import { Monitor } from "lucide-react";

/**
 * 라이브 송출 스튜디오 — OBS + SRS RTMP → HLS (트위치/치지직 계열).
 * 브라우저 WebRTC 송출은 제거 (안정성).
 */
export function LiveBroadcastStudio({
  channelId,
  onEndStream,
}: {
  channelId: string;
  initialMode?: unknown;
  onEndStream: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
        <Monitor className="h-4 w-4" />
        <span>
          <strong className="text-foreground">OBS</strong>로 송출 → 시청자는 HLS로 시청 (3~10초 지연)
        </span>
      </div>
      <LiveObsStudio channelId={channelId} onEndStream={onEndStream} />
    </div>
  );
}
