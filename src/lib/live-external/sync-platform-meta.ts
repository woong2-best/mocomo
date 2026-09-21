import { db } from "@/lib/db";
import {
  fetchExternalPlatformMetadata,
  type ExternalPlatformMetadata,
} from "@/lib/live-external/platform-metadata";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import { revalidateLiveHubCache } from "@/lib/live-hub-data";
import { revalidateTag } from "next/cache";
import { liveRoomCacheTag } from "@/lib/cached-live-meta";

/**
 * Pull live title/description from YouTube/Twitch/Chzzk and mirror onto VoiceChannel.
 * Returns the platform metadata (even if DB write is skipped).
 */
export async function syncExternalChannelPlatformMeta(params: {
  channelId: string;
  provider: LiveExternalProvider;
  externalId: string;
  currentName?: string | null;
  currentDescription?: string | null;
}): Promise<ExternalPlatformMetadata> {
  const meta = await fetchExternalPlatformMetadata(params.provider, params.externalId);
  const nextName = meta.title?.trim().slice(0, 120) || null;
  const nextDescription = meta.description?.trim().slice(0, 500) || null;

  if (!nextName && !nextDescription) return meta;

  const nameChanged = nextName != null && nextName !== (params.currentName ?? "").trim();
  const descChanged =
    nextDescription != null && nextDescription !== (params.currentDescription ?? "").trim();

  if (!nameChanged && !descChanged) return meta;

  try {
    await db.voiceChannel.update({
      where: { id: params.channelId },
      data: {
        ...(nameChanged && nextName ? { name: nextName } : {}),
        ...(descChanged ? { description: nextDescription } : {}),
      },
    });
    revalidateLiveHubCache();
    revalidateTag(liveRoomCacheTag(params.channelId));
  } catch {
    /* best-effort */
  }

  return meta;
}
