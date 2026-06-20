import { NextResponse } from "next/server";
import { getLiveHubChannelFeed } from "@/lib/live-hub-data";

export const dynamic = "force-dynamic";

/** APT TV — 현재 방송 중인 채널 목록 */
export async function GET() {
  try {
    const { channels, hosts } = await getLiveHubChannelFeed();
    const hostMap = new Map(hosts.map((h) => [h.id, h]));
    const live = channels
      .filter((c) => c.viewerCount >= 0)
      .slice(0, 12)
      .map((c) => ({
        id: c.id,
        name: c.name,
        hostUserId: c.createdBy,
        hostUsername: hostMap.get(c.createdBy)?.username ?? null,
        viewerCount: c.viewerCount,
        thumbnailUrl: c.thumbnailUrl,
      }));
    return NextResponse.json({ channels: live, featured: live[0] ?? null });
  } catch (e) {
    console.error("[apt/live-channels]", e);
    return NextResponse.json({ channels: [], featured: null });
  }
}
