"use client";

import { useEffect, useState } from "react";
import type { LiveStreamCategory, SupportTierLevel } from "@prisma/client";
import { LiveRoomClient } from "@/components/live/live-room-client";

const LIVE_PW_KEY = (id: string) => `mocomo_live_pw_${id}`;

export function LiveRoomEntry({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  hostDisplayName,
  hostTier,
  hostTotalSupport,
  isHost,
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
  isHost: boolean;
  category?: LiveStreamCategory;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  tipRanking?: { username: string; amount: number }[];
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  paymentsEnabled?: boolean;
}) {
  const [storedPassword, setStoredPassword] = useState<string | null>(null);

  useEffect(() => {
    if (isHost) {
      setStoredPassword(sessionStorage.getItem(LIVE_PW_KEY(channelId)));
    }
  }, [isHost, channelId]);

  return (
    <LiveRoomClient
      channelId={channelId}
      channelName={channelName}
      hostUserId={hostUserId}
      hostUsername={hostUsername}
      hostDisplayName={hostDisplayName}
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
      paymentsEnabled={paymentsEnabled}
    />
  );
}
