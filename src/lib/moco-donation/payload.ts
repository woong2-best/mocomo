import type { MocoDonation } from "@prisma/client";
import { extractYoutubeVideoId } from "@/lib/video-donation";
import { resolveDonationSfx } from "@/lib/moco-donation/sfx-catalog";
import type { MocoDonationPayload } from "@/lib/moco-donation/types";

type Row = MocoDonation & { user: { username: string } };

export function toMocoDonationPayload(row: Row): MocoDonationPayload {
  const sfx = row.sfxKey ? resolveDonationSfx(row.sfxKey) : null;
  return {
    id: row.id,
    channelId: row.channelId,
    streamerId: row.streamerId,
    type: row.type,
    mocoAmount: row.mocoAmount,
    mediaUrl: row.mediaUrl,
    videoId: row.mediaUrl ? extractYoutubeVideoId(row.mediaUrl) : null,
    videoTitle: row.videoTitle,
    message: row.message,
    sfxKey: row.sfxKey,
    sfxSrc: sfx?.src ?? null,
    startSec: row.startSec ?? 0,
    endSec: row.endSec,
    playToEnd: row.playToEnd ?? false,
    segmentPlaySec: row.segmentPlaySec,
    maxPlaySec: row.maxPlaySec,
    status: row.status,
    username: row.user.username,
    senderId: row.userId,
    at: row.createdAt.getTime(),
  };
}
