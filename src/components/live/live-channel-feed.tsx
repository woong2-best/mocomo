import { getAuthUserId } from "@/lib/auth";
import { parseLiveHubModeParam } from "@/lib/live-hub-mode";
import { getLiveHubChannelFeed, getLiveHubStaticData } from "@/lib/live-hub-data";
import { LiveChannelGrid } from "@/components/live/live-channel-grid";
import { filterNsfwChannels, resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";

/**
 * Always loads the full live feed; folder rail filters client-side
 * so category clicks never navigate away from /live.
 */
export async function LiveChannelFeed({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; mode?: string; view?: string; q?: string }>;
}) {
  const { mode: modeRaw, q: qRaw } = await searchParams;
  const mode = parseLiveHubModeParam(modeRaw);
  const q = qRaw?.trim().toLowerCase() ?? "";
  const userId = await getAuthUserId();
  const canViewNsfw = await resolveCanViewNsfw(userId);

  let channels: Awaited<ReturnType<typeof getLiveHubChannelFeed>>["channels"] = [];
  let hosts: Awaited<ReturnType<typeof getLiveHubChannelFeed>>["hosts"] = [];
  let followedHostIds: string[] = [];

  try {
    ({ channels, hosts } = await getLiveHubChannelFeed(undefined, mode));
    channels = filterNsfwChannels(channels, canViewNsfw);

    const staticData = await getLiveHubStaticData(userId);
    followedHostIds = [
      ...new Set(staticData.followedLive.map((ch) => ch.createdBy)),
    ];

    if (q) {
      const hostById = Object.fromEntries(hosts.map((h) => [h.id, h]));
      channels = channels.filter((ch) => {
        const host = hostById[ch.createdBy];
        return (
          ch.name.toLowerCase().includes(q) ||
          host?.username.toLowerCase().includes(q)
        );
      });
    }
  } catch {
    /* DB 미마이그레이션 */
  }

  return (
    <LiveChannelGrid
      channels={channels}
      hosts={hosts}
      followedHostIds={followedHostIds}
    />
  );
}
