"use client";

import { useState } from "react";
import { DollarSign, Target } from "lucide-react";
import { LiveSupportDialog } from "@/components/live/live-support-dialog";
import { CommentDonationDialog } from "@/components/live/comment-donation-dialog";
import { useLiveChat } from "@/components/live/live-chat-provider";
import { cn } from "@/lib/utils";

/** External live viewer — 댓글후원 · 미션 */
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
  const [commentOpen, setCommentOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);

  if (isHost) return null;
  if (!hostUserId || !hostUsername) return null;

  const btnClass = cn(
    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 py-2",
    "text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
  );

  return (
    <div className="flex gap-2">
      {paymentsEnabled ? (
        <>
          <button type="button" className={btnClass} onClick={() => setCommentOpen(true)}>
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            댓글후원
          </button>
          <CommentDonationDialog
            creatorId={hostUserId}
            username={hostUsername}
            displayName={hostDisplayName}
            channelId={channelId}
            returnPath={`/voice/${channelId}`}
            paymentsEnabled
            open={commentOpen}
            onOpenChange={setCommentOpen}
          />
        </>
      ) : (
        <button type="button" className={btnClass} disabled>
          <DollarSign className="h-3.5 w-3.5" />
          댓글후원
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
  );
}
