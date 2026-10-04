import type { MocoDonation } from "@prisma/client";
import { extractYoutubeVideoId } from "@/lib/video-donation";
import { resolveDonationSfx } from "@/lib/moco-donation/sfx-catalog";
import type { MocoDonationPayload } from "@/lib/moco-donation/types";
import { joinMoco } from "@/lib/moco/decimal-amount";
import { formatCentiAsMoco } from "@/lib/moco-donation/video-pricing";

type Row = MocoDonation & { user: { username: string } };

export function toMocoDonationPayload(row: Row): MocoDonationPayload {
  const sfx = row.sfxKey ? resolveDonationSfx(row.sfxKey) : null;
  return {
    id: row.id,
    channelId: row.channelId,
    streamerId: row.streamerId,
    type: row.type,
    mocoAmount:
      row.mocoCenti > 0
        ? row.mocoCenti / 100
        : joinMoco(row.mocoAmount, row.mocoAmountTenths),
    mocoCenti:
      row.mocoCenti > 0
        ? row.mocoCenti
        : row.mocoAmount * 100 + row.mocoAmountTenths * 10 + row.mocoAmountHundredths,
    mocoLabel: formatCentiAsMoco(
      row.mocoCenti > 0
        ? row.mocoCenti
        : row.mocoAmount * 100 + row.mocoAmountTenths * 10 + row.mocoAmountHundredths
    ),
    playedAt: row.playedAt ? row.playedAt.getTime() : null,
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
