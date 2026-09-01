import { NextRequest, NextResponse } from "next/server";
import type { LiveStreamCategory } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import {
  getLiveHubChannelFeed,
  getLiveHubChannelFeedPage,
  getLiveHubStaticData,
  LIVE_HUB_PAGE_SIZE,
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
    isNsfw: ch.isNsfw === true,
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
  const offsetRaw = Number(req.nextUrl.searchParams.get("offset") ?? "0");
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? String(LIVE_HUB_PAGE_SIZE));
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 50) : LIVE_HUB_PAGE_SIZE;

  const [page, allFeed, staticData] = await Promise.all([
    getLiveHubChannelFeedPage(category, "all", offset, limit),
    category && offset === 0 ? getLiveHubChannelFeed(undefined, "all") : Promise.resolve(null),
    offset === 0 ? getLiveHubStaticData(userId) : Promise.resolve(null),
  ]);

  const hostMap = new Map(page.hosts.map((h) => [h.id, h]));
  if (staticData) {
    for (const h of staticData.followedHosts) {
      if (!hostMap.has(h.id)) hostMap.set(h.id, h);
    }
  }

  const items = page.channels.map((ch) => mapItem(ch, hostMap));

  const popularSource = allFeed?.channels ?? (offset === 0 ? page.channels : []);
  const viewerByCategory: Partial<Record<LiveStreamCategory, number>> = {};
  for (const ch of popularSource) {
    const key = ch.category as LiveStreamCategory;
    viewerByCategory[key] = (viewerByCategory[key] ?? 0) + (ch.viewerCount || 0);
  }

  const popularCategories =
    offset === 0
      ? [...CATEGORY_ORDER]
          .sort((a, b) => (viewerByCategory[b] ?? 0) - (viewerByCategory[a] ?? 0))
          .map((id) => ({
            id,
            viewerCount: viewerByCategory[id] ?? 0,
          }))
      : [];

  const followedHostMap = staticData
    ? new Map(staticData.followedHosts.map((h) => [h.id, h]))
    : new Map<string, LiveHubHost>();
  const followed = staticData
    ? staticData.followedLive.map((ch) => mapItem(ch, followedHostMap))
    : [];

  const recommended = staticData
    ? staticData.recommendedStreamers.map((h) => ({
        id: h.id,
        username: h.username,
        image: h.image,
        isPartner: h.isPartner,
        followerCount: h.followerCount,
      }))
    : [];

  const scheduled = staticData
    ? staticData.scheduledStreams.map((s) => ({
        id: s.id,
        title: s.name,
        thumbnailUrl: s.thumbnailUrl,
        category: s.category,
        scheduledAt: s.scheduledAt?.toISOString() ?? null,
        broadcastMode: s.broadcastMode ?? null,
        hostId: s.createdBy,
      }))
    : [];

  const categoryRows =
    offset === 0 && !category
      ? page.categoryRows.map((row) => ({
          id: row.category,
          label: row.category,
          channels: row.channels.map((ch) => mapItem(ch, hostMap)),
        }))
      : [];

  const heroItems =
    offset === 0 && !category
      ? page.heroChannels.map((ch) => mapItem(ch, hostMap))
      : [];

  return NextResponse.json({
    items,
    heroItems,
    popularCategories,
    followed,
    recommended,
    scheduled,
    category: category ?? null,
    total: page.total,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
    categoryRows,
  });
}
