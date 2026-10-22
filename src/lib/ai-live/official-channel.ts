import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { IDOLS, type IdolId } from "@/lib/ai-live/idols";
import {
  MOCO_OFFICIAL_CHANNEL_ID,
  MOCO_OFFICIAL_USERNAME,
} from "@/lib/ai-live/official-channel-id";

export type MocoOfficialChannel = {
  channelId: string;
  hostUserId: string;
};

type AlwaysOnProfile = {
  id: string;
  username: string;
  name: string;
};

const ALWAYS_ON_PROFILES: Record<string, AlwaysOnProfile> = {
  [MOCO_OFFICIAL_CHANNEL_ID]: {
    id: MOCO_OFFICIAL_CHANNEL_ID,
    username: MOCO_OFFICIAL_USERNAME,
    name: "Moco",
  },
  ...Object.fromEntries(
    IDOLS.map((idol) => [
      idol.channelId,
      { id: idol.channelId, username: idol.username, name: idol.id.toUpperCase() },
    ])
  ),
};

async function officialUserId(username: string, name: string): Promise<string> {
  const existing = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await db.user.create({
      data: {
        username,
        name,
        locale: "en",
        countryCode: "KR",
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await db.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (again) return again.id;
    }
    throw err;
  }
}

/** Keeps one first-party channel LIVE so the normal MOCO donation API can pay that host. */
export async function ensureAlwaysOnChannel(channelId: string): Promise<MocoOfficialChannel> {
  const profile = ALWAYS_ON_PROFILES[channelId];
  if (!profile) throw new Error("Unknown always-on channel.");

  const ready = await db.voiceChannel.findUnique({
    where: { id: profile.id },
    select: { createdBy: true, isLive: true, liveStatus: true, endedAt: true },
  });
  if (ready?.isLive && ready.liveStatus === "LIVE" && !ready.endedAt) {
    return { channelId: profile.id, hostUserId: ready.createdBy };
  }

  const hostUserId = await officialUserId(profile.username, profile.name);
  await db.voiceChannel.upsert({
    where: { id: profile.id },
    create: {
      id: profile.id,
      name: profile.name,
      createdBy: hostUserId,
      isLive: true,
      liveStatus: "LIVE",
      mediaSourceType: "FIRST_PARTY",
      broadcastMode: "BROWSER",
      category: "JUST_CHATTING",
      liveVisibility: "PUBLIC",
      donationAlertsOnStream: true,
      maxUsers: 5000,
      thumbnailUrl: "/live/moco-poster.png",
      endedAt: null,
    },
    update: {
      createdBy: hostUserId,
      isLive: true,
      liveStatus: "LIVE",
      donationAlertsOnStream: true,
      endedAt: null,
      thumbnailUrl: "/live/moco-poster.png",
    },
  });
  return { channelId: profile.id, hostUserId };
}

export async function ensureMocoOfficialChannel(): Promise<MocoOfficialChannel> {
  return ensureAlwaysOnChannel(MOCO_OFFICIAL_CHANNEL_ID);
}

/** Opening any idol room prepares all three, so a tab change still has a payable channel. */
export async function ensureIdolChannels(): Promise<Partial<Record<IdolId, string>>> {
  const channels: Partial<Record<IdolId, string>> = {};
  for (const idol of IDOLS) {
    const row = await ensureAlwaysOnChannel(idol.channelId);
    channels[idol.id] = row.channelId;
  }
  return channels;
}
