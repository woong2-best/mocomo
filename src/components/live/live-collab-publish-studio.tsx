"use client";

import { Users } from "lucide-react";
import { LiveCloudflareWhepPlayer } from "@/components/live/live-cloudflare-whep-player";
import {
  LiveCollabCoHostPanel,
  LiveCollabPublishRoom,
} from "@/components/live/live-collab-livekit-room";
import { LiveCollabLocalPreview } from "@/components/live/live-collab-cohost-video";

/** CO_HOST 합방 송출 — 좌: 호스트 / 우: 내 카메라 */
export function LiveCollabPublishStudio({
  channelId,
  coHostLabel,
}: {
  channelId: string;
  coHostLabel?: string;
}) {
  return (
    <LiveCollabPublishRoom channelId={channelId}>
      <div className="relative w-full aspect-video rounded-xl overflow-hidden ring-1 ring-border/50 bg-black shadow-sm">
        <div className="absolute inset-0 grid grid-cols-2">
          <div className="relative min-h-0 min-w-0 border-r border-white/10">
            <LiveCloudflareWhepPlayer channelId={channelId} embedded />
            <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-orange-600/90 text-white text-[9px] font-bold">
              호스트
            </span>
          </div>
          <div className="relative min-h-0 min-w-0">
            <LiveCollabLocalPreview />
            <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-violet-600/90 text-white text-[9px] font-bold">
              합방 (나)
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Users className="h-3.5 w-3.5" />
        아래에서 마이크·카메라를 조절하세요. 시청자 화면은 좌우 분할로 표시됩니다.
        {coHostLabel ? ` · ${coHostLabel}` : ""}
      </p>
    </LiveCollabPublishRoom>
  );
}

/** 호스트 스튜디오 — 합방자 영상 우측 미리보기 */
export function LiveHostCollabPreview({
  channelId,
  coHostUserId,
  coHostLabel,
  children,
}: {
  channelId: string;
  coHostUserId: string;
  coHostLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-border/50 shadow-sm">
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="relative min-h-0 min-w-0 border-r border-white/10 overflow-hidden">
          {children}
          <span className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded bg-orange-600/90 text-white text-[9px] font-bold pointer-events-none">
            호스트
          </span>
        </div>
        <div className="relative min-h-0 min-w-0">
          <LiveCollabCoHostPanel
            channelId={channelId}
            coHostUserId={coHostUserId}
            coHostLabel={coHostLabel}
          />
          <span className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded bg-violet-600/90 text-white text-[9px] font-bold pointer-events-none">
            합방
          </span>
        </div>
      </div>
    </div>
  );
}
