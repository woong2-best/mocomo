"use client";

import { useEffect, useState } from "react";
import { LiveRoomClient } from "@/components/live/live-room-client";

const LIVE_PW_KEY = (id: string) => `mocomo_live_pw_${id}`;

export function LiveRoomEntry({
  channelId,
  channelName,
  hostUserId,
  hostUsername,
  isHost,
}: {
  channelId: string;
  channelName: string;
  hostUserId: string;
  hostUsername?: string;
  isHost: boolean;
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
      isHost={isHost}
      storedPassword={storedPassword}
    />
  );
}
