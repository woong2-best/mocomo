import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getLiveHubChannelFeed } from "@/lib/live-hub-data";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-list", 60);
  if (limited) return limited;

  // Optional auth — reserved for followed-live enrichment later
  await getMobileUserId(req);

  const { channels, hosts } = await getLiveHubChannelFeed(undefined, "all");
  const hostMap = new Map(hosts.map((h) => [h.id, h]));

  const items = channels.map((ch) => {
    const host = hostMap.get(ch.createdBy);
    return {
      id: ch.id,
      title: ch.name,
      thumbnailUrl: ch.thumbnailUrl,
      viewerCount: ch.viewerCount,
      category: ch.category,
      broadcastMode: ch.broadcastMode ?? null,
      host: host
        ? { id: host.id, username: host.username, image: host.image }
        : { id: ch.createdBy, username: "host", image: null },
    };
  });

  return NextResponse.json({ items });
}
