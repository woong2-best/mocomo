import { db } from "@/lib/db";
import { ensureAlwaysOnChannel } from "@/lib/ai-live/official-channel";
import { isAlwaysOnLiveChannel, MOCO_OFFICIAL_CHANNEL_ID } from "@/lib/ai-live/official-channel-id";
import { mocoDonationPlayMs } from "@/lib/ai-live/donation-playback";
import { toMocoDonationPayload } from "@/lib/moco-donation/payload";
import type { MocoDonationPayload } from "@/lib/moco-donation/types";
import { creditSettlementMocoCentiInTx } from "@/lib/settlement-moco/economy";

const includeUser = { user: { select: { username: true } } } as const;

async function finishIfDue(channelId: string): Promise<void> {
  const playing = await db.mocoDonation.findFirst({
    where: { channelId, status: "PLAYING" },
    orderBy: { playedAt: "desc" },
  });
  if (!playing) return;
  const started = playing.playedAt?.getTime() ?? 0;
  if (started > 0 && Date.now() - started < mocoDonationPlayMs(playing)) return;

  await db.$transaction(async (tx) => {
    const done = await tx.mocoDonation.updateMany({
      where: { id: playing.id, status: "PLAYING" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (done.count !== 1) return;
    if (playing.type !== "VIDEO" || playing.settledAt || playing.mocoCenti <= 0) return;
    const claimed = await tx.mocoDonation.updateMany({
      where: { id: playing.id, settledAt: null },
      data: { settledAt: new Date() },
    });
    if (claimed.count !== 1) return;
    await creditSettlementMocoCentiInTx(tx, {
      userId: playing.streamerId,
      centi: playing.mocoCenti,
      reason: "Video donation settled on avatar room",
      referenceType: "video_donation_settle",
      referenceId: playing.id,
      metadata: { channelId, giftEventId: playing.giftEventId },
    });
  });
}

/** One shared now-playing row for every viewer of an always-on room. */
export async function currentOfficialDonation(
  channelId: string = MOCO_OFFICIAL_CHANNEL_ID
): Promise<MocoDonationPayload | null> {
  if (!isAlwaysOnLiveChannel(channelId)) return null;
  await ensureAlwaysOnChannel(channelId);
  await finishIfDue(channelId);

  const playing = await db.mocoDonation.findFirst({
    where: { channelId, status: "PLAYING" },
    orderBy: { playedAt: "desc" },
    include: includeUser,
  });
  if (playing) return toMocoDonationPayload(playing);

  const pending = await db.mocoDonation.findFirst({
    where: { channelId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  if (!pending) return null;

  const claimed = await db.mocoDonation.updateMany({
    where: { id: pending.id, status: "PENDING" },
    data: { status: "PLAYING", playedAt: new Date() },
  });
  if (claimed.count === 0) {
    const raced = await db.mocoDonation.findFirst({
      where: { channelId, status: "PLAYING" },
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
