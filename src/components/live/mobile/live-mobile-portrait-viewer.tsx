"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, Eye, Send, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LiveViewerPlayer } from "@/components/live/live-viewer-player";
import { LiveRoomFollowButton } from "@/components/live/live-room-follow-button";
import { LiveMobileOverlayChat } from "@/components/live/mobile/live-mobile-overlay-chat";
import type { LiveBroadcastMode, LiveStreamCategory, SupportTierLevel } from "@prisma/client";

export type LiveMobilePortraitViewerProps = {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  hostDisplayName?: string;
  hostImage?: string | null;
  hostTier?: SupportTierLevel;
  hostTotalSupport?: number;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  category?: LiveStreamCategory;
  paymentsEnabled?: boolean;
  hostFollowing?: boolean;
  broadcastMode?: LiveBroadcastMode | null;
};

/** 시청자 — 모바일 세로 인스타 라이브 UI (데스크탑과 분리) */
export function LiveMobilePortraitViewer({
  channelId,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostImage,
  hostTier,
  hostTotalSupport,
  viewerCount,
  onViewerCount,
  paymentsEnabled,
  hostFollowing,
  broadcastMode,
}: LiveMobilePortraitViewerProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function share() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/voice/${channelId}`
        : `/voice/${channelId}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="live-mobile-portrait-root fixed inset-0 z-[110] bg-black text-white">
      <div className="absolute inset-0">
        <div className="h-full w-full [&_video]:object-cover [&_.aspect-video]:aspect-auto [&_.aspect-video]:h-full [&_.aspect-video]:min-h-full [&_.aspect-video]:rounded-none">
          <LiveViewerPlayer
            channelId={channelId}
            hostUserId={hostUserId}
            broadcastMode={broadcastMode}
          />
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70 pointer-events-none" />

      <header className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 pt-safe pb-2 pointer-events-auto">
        {hostUsername ? (
          <Link
            href={`/u/${hostUsername}`}
            className="flex items-center gap-2 min-w-0 flex-1 rounded-full bg-black/35 backdrop-blur-md pr-3 py-1 pl-1"
          >
            <Avatar className="h-9 w-9 border border-white/30">
              <AvatarImage src={hostImage ?? undefined} />
              <AvatarFallback className="text-xs bg-folk-terracotta text-white">
                {hostUsername[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">@{hostUsername}</p>
              <p className="text-[10px] text-white/75 truncate">{hostDisplayName ?? hostUsername}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-white/80 shrink-0" />
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        <span className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-r from-pink-500 to-orange-500 shadow-md">
          라이브
        </span>

        <span className="shrink-0 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-xs tabular-nums">
          <Eye className="h-3.5 w-3.5" />
          {viewerCount}
        </span>

        <div className="shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={share}
            className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
            aria-label="공유"
          >
            {copied ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => router.push("/live")}
            className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
            aria-label="나가기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {hostUsername && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+3.25rem)] left-3 z-20 pointer-events-auto">
          <LiveRoomFollowButton
            hostUserId={hostUserId}
            hostUsername={hostUsername}
            initialFollowing={!!hostFollowing}
          />
        </div>
      )}

      <div className="absolute left-0 right-0 bottom-0 z-20 flex flex-col justify-end max-h-[55vh] pointer-events-none">
        <LiveMobileOverlayChat
          channelId={channelId}
          onViewerCount={onViewerCount}
          hostUserId={hostUserId}
          hostUsername={hostUsername}
          hostDisplayName={hostDisplayName}
          paymentsEnabled={paymentsEnabled}
        />
      </div>
    </div>
  );
}
