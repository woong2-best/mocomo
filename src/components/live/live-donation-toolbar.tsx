"use client";

import { DollarSign } from "lucide-react";
import { CommentDonationDialog } from "@/components/live/comment-donation-dialog";

/** 치지직 스타일 채팅 하단 — 댓글 후원 (YouTube Super Chat) */
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
  if (isHost) return null;
  if (!hostUserId || !hostUsername) return null;

  return (
    <div className="flex items-end justify-between gap-2 px-2 pb-1">
      <CommentDonationDialog
        creatorId={hostUserId}
        username={hostUsername}
        displayName={hostDisplayName}
        channelId={channelId}
        returnPath={`/voice/${channelId}`}
        paymentsEnabled={paymentsEnabled}
        trigger={
          <button
            type="button"
            disabled={!paymentsEnabled}
            className="flex items-center gap-1.5 min-h-[36px] rounded-md px-3 py-2 text-sm font-bold bg-[#0d4d2c] text-white shadow-sm hover:bg-[#0d4d2c]/90 transition-colors disabled:opacity-50"
          >
            <DollarSign className="h-4 w-4 text-yellow-300" />
            댓글 후원
          </button>
        }
      />
      <span className="text-[11px] text-muted-foreground px-2 py-1.5 rounded-md bg-muted/40 shrink-0">
        채팅
      </span>
    </div>
  );
}
