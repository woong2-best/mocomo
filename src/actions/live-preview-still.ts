"use server";

import { db } from "@/lib/db";
import { requireAuthMinimal } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import { revalidateLiveHubCache } from "@/lib/live-hub-data";
import { liveRoomCacheTag } from "@/lib/cached-live-meta";

/** Host uploads a frozen frame of the current first-party live for hub posters. */
export async function saveLivePreviewStill(channelId: string, thumbnailUrl: string) {
  const user = await requireAuthMinimal();
  const url = thumbnailUrl.trim();
  if (!channelId || !url || url.length > 1200) {
    return { error: "Invalid still" };
  }
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
    return { error: "Invalid still" };
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, isLive: true },
  });
  if (!channel || channel.createdBy !== user.id) {
    return { error: "Not allowed" };
  }
  if (!channel.isLive) {
    return { error: "Not live" };
  }

  await db.voiceChannel.update({
    where: { id: channelId },
    data: { thumbnailUrl: url },
  });
  revalidateLiveHubCache();
  revalidateTag(liveRoomCacheTag(channelId));
  return { ok: true as const };
}
