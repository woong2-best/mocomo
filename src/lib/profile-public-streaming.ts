import type { StreamingPlatform } from "@prisma/client";
import { db } from "@/lib/db";

export type ProfileStreamingChannelLink = {
  platform: Extract<StreamingPlatform, "YOUTUBE" | "TWITCH">;
  channelUrl: string;
  channelName: string;
};

type ProfileVisibility = {
  showYoutubeOnProfile?: boolean | null;
  showTwitchOnProfile?: boolean | null;
};

export async function getVisibleProfileStreamingLinks(
  userId: string,
  profile: ProfileVisibility | null | undefined
): Promise<ProfileStreamingChannelLink[]> {
  const showYoutube = profile?.showYoutubeOnProfile ?? true;
  const showTwitch = profile?.showTwitchOnProfile ?? true;
  if (!showYoutube && !showTwitch) return [];

  const platforms: StreamingPlatform[] = [];
  if (showYoutube) platforms.push("YOUTUBE");
  if (showTwitch) platforms.push("TWITCH");
  if (platforms.length === 0) return [];

  const rows = await db.connectedStreamingAccount.findMany({
    where: {
      userId,
      platform: { in: platforms },
      verified: true,
      revokedAt: null,
    },
    select: {
      platform: true,
      channelUrl: true,
      channelName: true,
    },
    orderBy: { platform: "asc" },
  });

  return rows
    .filter(
      (row): row is ProfileStreamingChannelLink =>
        row.platform === "YOUTUBE" || row.platform === "TWITCH"
    )
    .map((row) => ({
      platform: row.platform,
      channelUrl: row.channelUrl,
      channelName: row.channelName,
    }));
}
