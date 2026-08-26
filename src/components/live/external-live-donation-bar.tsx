"use client";

import { useState } from "react";
import { Film, Heart, Target } from "lucide-react";
import { LiveSupportDialog } from "@/components/live/live-support-dialog";
import { VideoTipWizardDialog } from "@/components/support/video-tip-wizard-dialog";
import { useLiveChat } from "@/components/live/live-chat-provider";

/** v2 external viewer — 채팅후원 · 영상후원 · 미션 */
export function ExternalLiveDonationBar({
  channelId,
  hostDisplayName,
  hostUserId,
  hostUsername,
  paymentsEnabled,
  isHost,
}: {
  channelId: string;
  hostDisplayName: string;
  hostUserId?: string;
  hostUsername?: string;
  paymentsEnabled?: boolean;
  isHost?: boolean;
}) {
  const { socket, connected } = useLiveChat();
  const [videoOpen, setVideoOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);

  if (isHost) return null;
  if (!hostUserId || !hostUsername) return null;

  const btnClass =
    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-[#1a2030] px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#232a3d] disabled:opacity-50";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <LiveSupportDialog
          channelId={channelId}
          hostDisplayName={hostDisplayName}
          socket={socket}
          connected={connected}
          trigger={
            <button type="button" disabled={!connected} className={btnClass}>
              <Heart className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
              채팅후원
            </button>
          }
        />
        {paymentsEnabled ? (
          <>
            <button type="button" className={btnClass} onClick={() => setVideoOpen(true)}>
              <Film className="h-3.5 w-3.5" />
              영상후원
            </button>
            <VideoTipWizardDialog
              creatorId={hostUserId}
              username={hostUsername}
              displayName={hostDisplayName}
              channelId={channelId}
              returnPath={`/voice/${channelId}`}
              paymentsEnabled
              open={videoOpen}
              onOpenChange={setVideoOpen}
              trigger={null}
            />
          </>
        ) : (
          <button type="button" className={btnClass} disabled>
            <Film className="h-3.5 w-3.5" />
            영상후원
          </button>
        )}
        <LiveSupportDialog
          channelId={channelId}
          hostDisplayName={hostDisplayName}
          socket={socket}
          connected={connected}
          initialTab="MISSION"
          open={missionOpen}
          onOpenChange={setMissionOpen}
          trigger={
            <button type="button" disabled={!connected} className={btnClass}>
              <Target className="h-3.5 w-3.5" />
              미션
            </button>
          }
        />
      </div>
    </div>
  );
}
