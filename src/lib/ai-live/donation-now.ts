import { db } from "@/lib/db";
import { ensureMocoOfficialChannel } from "@/lib/ai-live/official-channel";
import { MOCO_OFFICIAL_CHANNEL_ID } from "@/lib/ai-live/official-channel-id";
import { mocoDonationPlayMs } from "@/lib/ai-live/donation-playback";
import { toMocoDonationPayload } from "@/lib/moco-donation/payload";
import type { MocoDonationPayload } from "@/lib/moco-donation/types";

const includeUser = { user: { select: { username: true } } } as const;

async function finishIfDue(): Promise<void> {
  const playing = await db.mocoDonation.findFirst({
    where: { channelId: MOCO_OFFICIAL_CHANNEL_ID, status: "PLAYING" },
    orderBy: { playedAt: "desc" },
  });
  if (!playing) return;
  const started = playing.playedAt?.getTime() ?? 0;
  if (started > 0 && Date.now() - started < mocoDonationPlayMs(playing)) return;
  await db.mocoDonation.updateMany({
    where: { id: playing.id, status: "PLAYING" },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

/** One shared now-playing row for every viewer of the official room. */
export async function currentOfficialDonation(): Promise<MocoDonationPayload | null> {
  await ensureMocoOfficialChannel();
  await finishIfDue();

  const playing = await db.mocoDonation.findFirst({
    where: { channelId: MOCO_OFFICIAL_CHANNEL_ID, status: "PLAYING" },
    orderBy: { playedAt: "desc" },
    include: includeUser,
  });
  if (playing) return toMocoDonationPayload(playing);

  const pending = await db.mocoDonation.findFirst({
    where: { channelId: MOCO_OFFICIAL_CHANNEL_ID, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  if (!pending) return null;

  const claimed = await db.mocoDonation.updateMany({
    where: { id: pending.id, status: "PENDING" },
    data: { status: "PLAYING", playedAt: new Date() },
  });
  if (claimed.count === 0) {
    const raced = await db.mocoDonation.findFirst({
      where: { channelId: MOCO_OFFICIAL_CHANNEL_ID, status: "PLAYING" },
      include: includeUser,
    });
    return raced ? toMocoDonationPayload(raced) : null;
  }

  const fresh = await db.mocoDonation.findUnique({
    where: { id: pending.id },
    include: includeUser,
  });
  return fresh ? toMocoDonationPayload(fresh) : null;
}
