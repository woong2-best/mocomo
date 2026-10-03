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

async function resolveProfileVisibility(
  userId: string,
  profile: ProfileVisibility | null | undefined
): Promise<{ showYoutube: boolean; showTwitch: boolean }> {
  let showYoutube = profile?.showYoutubeOnProfile ?? true;
  let showTwitch = profile?.showTwitchOnProfile ?? true;

  if (
    profile &&
    profile.showYoutubeOnProfile === undefined &&
    profile.showTwitchOnProfile === undefined
  ) {
    try {
      const row = await db.profile.findUnique({
        where: { userId },
        select: { showYoutubeOnProfile: true, showTwitchOnProfile: true },
      });
      if (row) {
        showYoutube = row.showYoutubeOnProfile;
        showTwitch = row.showTwitchOnProfile;
      }
    } catch {
      showYoutube = true;
      showTwitch = true;
    }
  }

  return { showYoutube, showTwitch };
}

export async function getVisibleProfileStreamingLinks(
  userId: string,
  profile: ProfileVisibility | null | undefined
): Promise<ProfileStreamingChannelLink[]> {
  let showYoutube = true;
  let showTwitch = true;
  try {
    ({ showYoutube, showTwitch } = await resolveProfileVisibility(userId, profile));
  } catch {
    showYoutube = true;
    showTwitch = true;
  }

  if (!showYoutube && !showTwitch) return [];

  const platforms: StreamingPlatform[] = [];
  if (showYoutube) platforms.push("YOUTUBE");
  if (showTwitch) platforms.push("TWITCH");

  let rows: {
    platform: StreamingPlatform;
    channelUrl: string;
    channelName: string;
  }[];

  try {
    rows = await db.connectedStreamingAccount.findMany({
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
  } catch {
    return [];
  }

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
