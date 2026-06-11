"use client";

import { Eye, Users } from "lucide-react";
import { LiveChat } from "@/components/live/live-chat";
import { LiveCollabPublishStudio } from "@/components/live/live-collab-publish-studio";
import { LiveStudioHeader } from "@/components/live/live-studio-header";
import { useLiveMobilePortrait } from "@/hooks/use-live-mobile-portrait";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { LiveDonationAlertOverlay, type LiveTipAlert } from "@/components/live/live-donation-alert-overlay";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { leaveLiveStream } from "@/actions/live-stream";

/** 합방(CO_HOST) 스튜디오 — 분할 송출 + 채팅 */
export function LiveCollabStudioShell({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostTier,
  hostTotalSupport,
  viewerCount,
  onViewerCount,
  category,
  donationGoalKrw,
  tipTotalKrw,
  cheerTotalCp,
  tipRanking,
  slowModeSeconds,
  chatBannedWords,
  paymentsEnabled,
  hostFollowing,
  recentTips = [],
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
  category?: LiveStreamCategory;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  cheerTotalCp?: number;
  tipRanking?: { username: string; amount: number }[];
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  paymentsEnabled?: boolean;
  hostFollowing?: boolean;
  recentTips?: LiveTipAlert[];
}) {
  const router = useRouter();
  const mobilePortrait = useLiveMobilePortrait();

  async function leaveCollab() {
    await leaveLiveStream(channelId);
    router.refresh();
  }

  if (mobilePortrait) {
    return (
      <div className="space-y-3 p-2">
        <LiveCollabPublishStudio channelId={channelId} />
        <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => void leaveCollab()}>
          합방 나가기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <header className="flex flex-wrap items-center gap-2 py-2 border-b border-border/60 sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-700 dark:text-violet-300 flex items-center gap-1">
          <Users className="h-3 w-3" />
          합방 스튜디오
        </span>
        <h1 className="text-base font-bold truncate flex-1 min-w-0">{channelName}</h1>
        <span className="text-sm text-muted-foreground flex items-center gap-1 tabular-nums">
          <Eye className="h-4 w-4" />
          {viewerCount}
        </span>
        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => void leaveCollab()}>
          합방 나가기
        </Button>
      </header>

      <LiveStudioHeader
        channelId={channelId}
        channelName={channelName}
        hostUserId={hostUserId}
        hostUsername={hostUsername}
        hostDisplayName={hostDisplayName}
        hostTier={hostTier}
        hostTotalSupport={hostTotalSupport}
        isHost={false}
        viewerCount={viewerCount}
        category={category}
        donationGoalKrw={donationGoalKrw}
        tipTotalKrw={tipTotalKrw}
        cheerTotalCp={cheerTotalCp}
        tipRanking={tipRanking}
        slowModeSeconds={slowModeSeconds}
        chatBannedWords={chatBannedWords}
        paymentsEnabled={paymentsEnabled}
        hostFollowing={hostFollowing}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 mt-3 items-start">
        <div className="min-w-0 space-y-4 relative">
          <LiveCollabPublishStudio channelId={channelId} />
          <LiveDonationAlertOverlay tips={recentTips} />
        </div>
        <div className="min-h-[360px] lg:sticky lg:top-[3.25rem] lg:max-h-[calc(100vh-5rem)] border border-border/60 rounded-xl overflow-hidden bg-card/30">
          <LiveChat
            channelId={channelId}
            viewerCount={viewerCount}
            onViewerCount={onViewerCount}
            hostUserId={hostUserId}
            hostUsername={hostUsername}
            hostDisplayName={hostDisplayName}
            paymentsEnabled={paymentsEnabled}
          />
        </div>
      </div>
    </div>
  );
}
