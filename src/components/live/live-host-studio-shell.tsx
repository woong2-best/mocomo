"use client";

import { LiveObsStudio } from "@/components/live/live-obs-studio";
import { LiveHlsPlayer } from "@/components/live/live-hls-player";
import { LiveChat } from "@/components/live/live-chat";
import { LiveStudioHeader } from "@/components/live/live-studio-header";
import type { LiveTipAlert } from "@/components/live/live-tip-alerts";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";

export function LiveHostStudioShell({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostTier,
  hostTotalSupport,
  viewerCount,
  onViewerCount,
  onEndStream,
  onRecentTips,
  category,
  donationGoalKrw,
  tipTotalKrw,
  tipRanking,
  slowModeSeconds,
  chatBannedWords,
  paymentsEnabled,
}: {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  hostDisplayName?: string;
  hostTier?: SupportTierLevel;
  hostTotalSupport?: number;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  onEndStream: () => void;
  onRecentTips?: (tips: LiveTipAlert[]) => void;
  category?: LiveStreamCategory;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  tipRanking?: { username: string; amount: number }[];
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  paymentsEnabled?: boolean;
}) {
  return (
    <div className="live-studio-twitch space-y-3">
      <LiveStudioHeader
        channelId={channelId}
        channelName={channelName}
        hostUserId={hostUserId}
        hostUsername={hostUsername}
        hostDisplayName={hostDisplayName}
        hostTier={hostTier}
        hostTotalSupport={hostTotalSupport}
        isHost
        viewerCount={viewerCount}
        category={category}
        donationGoalKrw={donationGoalKrw}
        tipTotalKrw={tipTotalKrw}
        tipRanking={tipRanking}
        slowModeSeconds={slowModeSeconds}
        chatBannedWords={chatBannedWords}
        paymentsEnabled={paymentsEnabled}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-3 xl:gap-4 items-start">
        <div className="space-y-3 min-w-0">
          <div className="rounded-xl overflow-hidden ring-1 ring-border/50 bg-black">
            <LiveHlsPlayer channelId={channelId} />
          </div>
          <p className="text-[11px] text-muted-foreground px-1">
            방송 미리보기 (OBS 시작 후 3~10초). 스트림 키는 OBS 패널에만 표시됩니다.
          </p>
          <LiveObsStudio channelId={channelId} onEndStream={onEndStream} />
        </div>

        <div className="xl:sticky xl:top-16 min-h-[min(70vh,560px)]">
          <LiveChat
            channelId={channelId}
            viewerCount={viewerCount}
            onViewerCount={onViewerCount}
            isHost
            canModerate
            onRecentTips={onRecentTips}
          />
        </div>
      </div>
    </div>
  );
}
