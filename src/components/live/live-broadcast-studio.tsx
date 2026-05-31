"use client";

import { LiveBrowserStudio } from "@/components/live/live-browser-studio";
import { Video } from "lucide-react";

/** 호스트 송출 — 브라우저(웹캠·화면공유) */
export function LiveBroadcastStudio({ channelId }: { channelId: string; onEndStream?: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
        <Video className="h-4 w-4" />
        <span>
          브라우저에서 <strong className="text-foreground">방송 시작</strong> → 시청자 실시간 시청
        </span>
      </div>
      <LiveBrowserStudio channelId={channelId} />
    </div>
  );
}
