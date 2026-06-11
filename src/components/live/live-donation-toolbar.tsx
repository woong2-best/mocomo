"use client";

import { useState } from "react";
import { Film, Heart } from "lucide-react";
import { LiveSupportDialog } from "@/components/live/live-support-dialog";
import { VideoTipWizardDialog } from "@/components/support/video-tip-wizard-dialog";
import { useLiveChat } from "@/components/live/live-chat-provider";

/** 치지직 스타일 채팅 하단 후원 툴바 */
export function LiveDonationToolbar({
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

  if (isHost) return null;
  if (!hostUserId || !hostUsername) return null;

  return (
    <div className="flex items-end justify-between gap-2 px-2 pb-1">
      <div className="flex items-stretch min-h-[36px] rounded-md overflow-hidden bg-[#0d4d2c] text-white shadow-sm">
        <LiveSupportDialog
          channelId={channelId}
          hostDisplayName={hostDisplayName}
          socket={socket}
          connected={connected}
          trigger={
            <button
              type="button"
              disabled={!connected}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <Heart className="h-4 w-4 text-yellow-300 fill-yellow-300" />
              후원하기
            </button>
          }
        />
        <span className="w-px bg-white/20 self-stretch my-1.5" aria-hidden />
        {paymentsEnabled && (
          <>
            <button
              type="button"
              title="영상 후원"
              className="flex items-center justify-center px-3 py-2 bg-white/10 hover:bg-white/20 transition-colors"
              onClick={() => setVideoOpen(true)}
            >
              <Film className="h-4 w-4" />
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
        )}
      </div>
      <span className="text-[11px] text-muted-foreground px-2 py-1.5 rounded-md bg-muted/40 shrink-0">
        채팅
      </span>
    </div>
  );
}
