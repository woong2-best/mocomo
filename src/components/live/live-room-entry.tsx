"use client";

import { useEffect, useState } from "react";
import type {
  LiveBroadcastMode,
  LiveStreamCategory,
  LiveVisibility,
  SupportTierLevel,
} from "@prisma/client";
import { LiveRoomClient } from "@/components/live/live-room-client";

const LIVE_PW_KEY = (id: string) => `mocomo_live_pw_${id}`;

export function LiveRoomEntry({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostImage,
  hostTier,
  hostTotalSupport,
  isHost,
  category,
  donationGoalKrw,
  tipTotalKrw,
  tipRanking,
  slowModeSeconds,
  chatBannedWords,
  donationAlertsOnStream,
  paymentsEnabled,
  broadcastMode,
  liveVisibility,
  minViewerTier,
  hostFollowing,
  isLiveOnAir,
  isNsfw,
}: {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  hostDisplayName?: string;
  hostImage?: string | null;
  hostTier?: SupportTierLevel;
  hostTotalSupport?: number;
  isHost: boolean;
  category?: LiveStreamCategory;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  tipRanking?: { username: string; amount: number }[];
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  donationAlertsOnStream?: boolean;
  paymentsEnabled?: boolean;
  broadcastMode?: LiveBroadcastMode;
  liveVisibility?: LiveVisibility;
  minViewerTier?: SupportTierLevel | null;
  hostFollowing?: boolean;
  /** 서버 기준 LIVE 여부 */
  isLiveOnAir?: boolean;
  isNsfw?: boolean;
}) {
  const [storedPassword, setStoredPassword] = useState<string | null>(null);

  useEffect(() => {
    if (!isHost) return;
    const read = () => setStoredPassword(sessionStorage.getItem(LIVE_PW_KEY(channelId)));
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [isHost, channelId]);

  return (
    <LiveRoomClient
      channelId={channelId}
      channelName={channelName}
      hostUserId={hostUserId}
      hostUsername={hostUsername}
      hostDisplayName={hostDisplayName}
      hostImage={hostImage}
      hostTier={hostTier}
      hostTotalSupport={hostTotalSupport}
      isHost={isHost}
      storedPassword={storedPassword}
      category={category}
      donationGoalKrw={donationGoalKrw}
      tipTotalKrw={tipTotalKrw}
      tipRanking={tipRanking}
      slowModeSeconds={slowModeSeconds}
      chatBannedWords={chatBannedWords}
      donationAlertsOnStream={donationAlertsOnStream}
      paymentsEnabled={paymentsEnabled}
      broadcastMode={broadcastMode}
      liveVisibility={liveVisibility}
      minViewerTier={minViewerTier}
      hostFollowing={hostFollowing}
      isLiveOnAir={isLiveOnAir}
      isNsfw={isNsfw}
    />
  );
}
