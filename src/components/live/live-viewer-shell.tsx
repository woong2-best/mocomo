"use client";

import { LiveViewerPlayer } from "@/components/live/live-viewer-player";
import { LiveChat } from "@/components/live/live-chat";
import { LiveStudioHeader } from "@/components/live/live-studio-header";
import { LiveMobilePortraitViewer } from "@/components/live/mobile/live-mobile-portrait-viewer";
import { useLiveMobilePortrait } from "@/hooks/use-live-mobile-portrait";
import type { LiveBroadcastMode, LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { LiveDonationAlertOverlay, type LiveTipAlert } from "@/components/live/live-donation-alert-overlay";
import { LiveVideoDonationOverlay } from "@/components/live/live-video-donation-panel";

export function LiveViewerShell({
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
  broadcastMode,
  isLiveOnAir,
  hostImage,
  recentTips = [],
}: {
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
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  cheerTotalCp?: number;
  tipRanking?: { username: string; amount: number }[];
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  paymentsEnabled?: boolean;
  hostFollowing?: boolean;
  broadcastMode?: LiveBroadcastMode | null;
  isLiveOnAir?: boolean;
  recentTips?: LiveTipAlert[];
}) {
  const mobilePortrait = useLiveMobilePortrait();

  if (mobilePortrait) {
    return (
      <LiveMobilePortraitViewer
        channelId={channelId}
        channelName={channelName}
        hostUserId={hostUserId}
        hostUsername={hostUsername}
        hostDisplayName={hostDisplayName}
        hostImage={hostImage}
        hostTier={hostTier}
        hostTotalSupport={hostTotalSupport}
        viewerCount={viewerCount}
        onViewerCount={onViewerCount}
        category={category}
        paymentsEnabled={paymentsEnabled}
        hostFollowing={hostFollowing}
        broadcastMode={broadcastMode}
        isLiveOnAir={isLiveOnAir}
        recentTips={recentTips}
      />
    );
  }

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

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-3 xl:gap-4 items-start">
        <div className="min-w-0 relative rounded-xl overflow-hidden ring-1 ring-border/50 bg-black">
          <LiveViewerPlayer
            channelId={channelId}
            hostUserId={hostUserId}
            broadcastMode={broadcastMode}
            isLiveOnAir={isLiveOnAir}
          />
          <LiveDonationAlertOverlay tips={recentTips} />
          <LiveVideoDonationOverlay channelId={channelId} />
        </div>
        <div className="xl:sticky xl:top-16 min-h-[min(70vh,560px)]">
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
