"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { LiveSupportDialog } from "@/components/live/live-support-dialog";
import { MocoDonationDialog } from "@/components/live/moco-donation-dialog";
import { MocoVideoDonationDialog } from "@/components/live/moco-video-donation-dialog";
import { useLiveChat } from "@/components/live/live-chat-provider";
import { cn } from "@/lib/utils";

/** External live viewer — YouTube 영상 · MOCO 효과음 · 미션 */
export function ExternalLiveDonationBar({
  channelId,
  hostDisplayName,
  isHost,
}: {
  channelId: string;
  hostDisplayName: string;
  isHost?: boolean;
}) {
  const { socket, connected } = useLiveChat();
  const [missionOpen, setMissionOpen] = useState(false);

  if (isHost) return null;

  const btnClass = cn(
    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 py-2",
    "text-xs font-semibold text-foreground transition-colors hover:bg-muted min-h-[36px]"
  );

  return (
    <div className="flex flex-wrap gap-2">
      <MocoVideoDonationDialog
        streamerId={channelId}
        trigger={
          <button type="button" className={btnClass}>
            영상 후원
          </button>
        }
      />
      <MocoDonationDialog
        streamerId={channelId}
        trigger={
          <button type="button" className={btnClass}>
            효과음 후원
          </button>
        }
      />
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
  );
}
