"use client";

import type { LiveBroadcastMode } from "@prisma/client";
import { useSession } from "next-auth/react";
import { LiveBroadcastPlayer } from "@/components/live/live-broadcast-player";
import { LiveOverlayLayer } from "@/components/live/overlays/live-overlay-layer";
import { LiveVideoChatOverlay } from "@/components/live/live-video-chat-overlay";
import { useLiveChatOverlay } from "@/hooks/use-live-chat-overlay";

/** 시청 — LiveKit WebRTC(브라우저) 또는 HLS + 오вер레이 */
export function LiveViewerPlayer({
  channelId,
  hostUserId,
  broadcastMode,
  isLiveOnAir,
  showOverlays = true,
  chatOverlayInitial = true,
}: {
  channelId: string;
  hostUserId?: string;
  broadcastMode?: LiveBroadcastMode | null;
  isLiveOnAir?: boolean;
  /** 모바일 풀스크린은 상위에서 별도 레이어 사용 */
  showOverlays?: boolean;
  /** 호스트가 끄기 전 기본값 */
  chatOverlayInitial?: boolean;
}) {
  const { data: session } = useSession();
  const { chatOverlayEnabled } = useLiveChatOverlay(
    channelId,
    session?.user?.id,
    chatOverlayInitial
  );

  return (
    <div className="relative h-full w-full min-h-0">
      <LiveBroadcastPlayer
        channelId={channelId}
        hostUserId={hostUserId}
        broadcastMode={broadcastMode}
        isLiveOnAir={isLiveOnAir}
      />
      {showOverlays && (
        <LiveOverlayLayer pointerEvents="none" className="z-[15]" />
      )}
      {chatOverlayEnabled && (
        <LiveVideoChatOverlay channelId={channelId} className="z-[16]" />
      )}
    </div>
  );
}
