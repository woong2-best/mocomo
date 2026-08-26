"use client";

import { useSession } from "next-auth/react";
import { LiveSupportDialog } from "@/components/live/live-support-dialog";
import { LiveSupportMissionPanel } from "@/components/live/live-support-mission-panel";
import { LiveSupportPollBar } from "@/components/live/live-support-poll-bar";
import { LiveVideoDonationPanel } from "@/components/live/live-video-donation-panel";
import { VideoTipWizardDialog } from "@/components/support/video-tip-wizard-dialog";
import { useLiveSupport } from "@/components/live/live-support-provider";
import { cn } from "@/lib/utils";

export function LiveSupportSidebar({
  channelId,
  isHost,
  hostDisplayName,
  hostUserId,
  hostUsername,
  paymentsEnabled,
  hideTopActions = false,
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
    <div
      className={cn(
        "space-y-2 px-2 pb-2 border-b",
        hideTopActions ? "border-white/10" : "border-border/40"
      )}
    >
      {!isHost && !hideTopActions && (
        <div className="flex justify-end gap-1.5 pt-2 flex-wrap">
          <LiveSupportDialog
            channelId={channelId}
            hostDisplayName={hostDisplayName}
            socket={socket}
            connected={connected}
          />
          {hostUserId && hostUsername && paymentsEnabled && (
            <VideoTipWizardDialog
              creatorId={hostUserId}
              username={hostUsername}
              displayName={hostDisplayName}
              channelId={channelId}
              returnPath={`/voice/${channelId}`}
              paymentsEnabled={!!paymentsEnabled}
            />
          )}
        </div>
      )}
      <LiveVideoDonationPanel channelId={channelId} isHost={isHost} />
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
