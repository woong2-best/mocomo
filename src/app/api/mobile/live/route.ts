import { NextRequest, NextResponse } from "next/server";
import type { LiveStreamCategory } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import {
  getLiveHubChannelFeed,
  getLiveHubStaticData,
  type LiveHubChannel,
  type LiveHubHost,
} from "@/lib/live-hub-data";
import { parseLiveCategoryParam } from "@/lib/live-categories";

const CATEGORY_ORDER: LiveStreamCategory[] = [
  "IRL",
  "JUST_CHATTING",
  "GAME",
  "MUSIC",
  "LIVE",
];

function mapItem(ch: LiveHubChannel, hostMap: Map<string, LiveHubHost>) {
  const host = hostMap.get(ch.createdBy);
  return {
    id: ch.id,
    title: ch.name,
    thumbnailUrl: ch.thumbnailUrl,
    viewerCount: ch.viewerCount,
    category: ch.category,
    tags: ch.tags ?? [],
    broadcastMode: ch.broadcastMode ?? null,
    host: host
      ? {
          id: host.id,
          username: host.username,
          image: host.image,
          isPartner: host.isPartner,
          followerCount: host.followerCount,
        }
      : {
          id: ch.createdBy,
          username: "host",
          image: null,
          isPartner: false,
          followerCount: 0,
        },
  };
}

/**
 * Mobile live hub — mirrors web `/live` feed:
 * items (+ category filter), popular category viewer totals,
 * followed lives, recommended streamers.
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-list", 60);
  if (limited) return limited;

  const userId = await getMobileUserId(req);
  const category = parseLiveCategoryParam(req.nextUrl.searchParams.get("category"));

  const [feed, allFeed, staticData] = await Promise.all([
    getLiveHubChannelFeed(category, "all"),
    category ? getLiveHubChannelFeed(undefined, "all") : Promise.resolve(null),
    getLiveHubStaticData(userId),
  ]);

  const hostMap = new Map(feed.hosts.map((h) => [h.id, h]));
  for (const h of staticData.followedHosts) {
    if (!hostMap.has(h.id)) hostMap.set(h.id, h);
  }

  const items = feed.channels.map((ch) => mapItem(ch, hostMap));

  const popularSource = allFeed?.channels ?? feed.channels;
  const viewerByCategory: Partial<Record<LiveStreamCategory, number>> = {};
  for (const ch of popularSource) {
    const key = ch.category as LiveStreamCategory;
    viewerByCategory[key] = (viewerByCategory[key] ?? 0) + (ch.viewerCount || 0);
  }

  const popularCategories = [...CATEGORY_ORDER]
    .sort((a, b) => (viewerByCategory[b] ?? 0) - (viewerByCategory[a] ?? 0))
    .map((id) => ({
      id,
      viewerCount: viewerByCategory[id] ?? 0,
    }));

  const followedHostMap = new Map(staticData.followedHosts.map((h) => [h.id, h]));
  const followed = staticData.followedLive.map((ch) => mapItem(ch, followedHostMap));

  const recommended = staticData.recommendedStreamers.map((h) => ({
    id: h.id,
    username: h.username,
    image: h.image,
    isPartner: h.isPartner,
    followerCount: h.followerCount,
  }));

  const scheduled = staticData.scheduledStreams.map((s) => ({
    id: s.id,
    title: s.name,
    thumbnailUrl: s.thumbnailUrl,
    category: s.category,
    scheduledAt: s.scheduledAt?.toISOString() ?? null,
    broadcastMode: s.broadcastMode ?? null,
    hostId: s.createdBy,
  }));

  return NextResponse.json({
    items,
    popularCategories,
    followed,
    recommended,
    scheduled,
    category: category ?? null,
  });
}
