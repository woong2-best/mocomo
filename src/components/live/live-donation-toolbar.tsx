"use client";

import { MocoDonationDialog } from "@/components/live/moco-donation-dialog";
import { MocoVideoDonationDialog } from "@/components/live/moco-video-donation-dialog";

/** 라이브 채팅 하단 — YouTube 영상 후원 · MOCO 효과음 후원 */
export function LiveDonationToolbar({
  channelId,
  mocoBalance,
  userImageUrl,
  onDonateSuccess,
  isHost,
}: {
  channelId: string;
  mocoBalance?: number;
  userImageUrl?: string | null;
  onDonateSuccess?: (remaining: number) => void;
  isHost?: boolean;
}) {
  if (isHost) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-2 pb-1">
      <MocoVideoDonationDialog
        streamerId={channelId}
        mocoBalance={mocoBalance}
        userImageUrl={userImageUrl}
        onSuccess={onDonateSuccess}
      />
      <MocoDonationDialog
        streamerId={channelId}
        mocoBalance={mocoBalance}
        userImageUrl={userImageUrl}
        onSuccess={onDonateSuccess}
      />
    </div>
  );
}
