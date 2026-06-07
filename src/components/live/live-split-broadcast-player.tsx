"use client";

import { LiveCloudflareWhepPlayer } from "@/components/live/live-cloudflare-whep-player";
import { LiveCollabCoHostPanel } from "@/components/live/live-collab-livekit-room";
import { LiveOverlayLayer } from "@/components/live/overlays/live-overlay-layer";

/** 분할 합방 — 좌: 호스트(WHEP) · 우: CO_HOST(LiveKit) */
export function LiveSplitBroadcastPlayer({
  channelId,
  coHostUserId,
  coHostLabel,
  showOverlays = true,
}: {
  channelId: string;
  coHostUserId: string;
  coHostLabel?: string;
  showOverlays?: boolean;
}) {
  return (
    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden ring-1 ring-border/40">
      <div className="absolute inset-0 grid grid-cols-2">
        <div className="relative min-h-0 min-w-0 border-r border-white/10">
          <LiveCloudflareWhepPlayer channelId={channelId} embedded />
          {showOverlays && (
            <LiveOverlayLayer pointerEvents="none" className="z-[15]" />
          )}
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
