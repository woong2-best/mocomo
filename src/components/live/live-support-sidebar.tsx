"use client";

import { useSession } from "next-auth/react";
import { LiveSupportMissionPanel } from "@/components/live/live-support-mission-panel";
import { LiveSupportPollBar } from "@/components/live/live-support-poll-bar";
import { useLiveSupport } from "@/components/live/live-support-provider";

export function LiveSupportSidebar({
  channelId,
  isHost,
  hostDisplayName: _hostDisplayName,
  hostUserId: _hostUserId,
  hostUsername: _hostUsername,
  paymentsEnabled: _paymentsEnabled,
  hideTopActions: _hideTopActions = false,
}: {
  channelId: string;
  isHost: boolean;
  hostDisplayName: string;
  hostUserId?: string;
  hostUsername?: string;
  paymentsEnabled?: boolean;
  /** External v2 viewer moves donation buttons to chat footer */
  hideTopActions?: boolean;
}) {
  const { socket, connected, missions, poll, upsertMission, setPoll, pushAlert } = useLiveSupport();
  const { data: session } = useSession();

  return (
    <div className="space-y-2 border-b border-border/40 px-2 pb-2">
      <LiveSupportPollBar
        channelId={channelId}
        isHost={isHost}
        socket={socket}
        poll={poll}
        onPoll={setPoll}
        onAlert={pushAlert}
      />
      <LiveSupportMissionPanel
        channelId={channelId}
        isHost={isHost}
        socket={socket}
        missions={missions}
        onMission={upsertMission}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
