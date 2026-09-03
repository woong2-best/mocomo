import { parseLiveCategoryParam } from "@/lib/live-categories";
import { parseLiveHubModeParam } from "@/lib/live-hub-mode";
import { getLiveHubChannelFeed } from "@/lib/live-hub-data";
import { LiveChannelGrid } from "@/components/live/live-channel-grid";
import { getAuthUserId } from "@/lib/auth";
import { filterNsfwChannels, resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";

export async function LiveChannelFeed({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; mode?: string }>;
}) {
  const { category: categoryRaw, mode: modeRaw } = await searchParams;
  const category = parseLiveCategoryParam(categoryRaw);
  const mode = parseLiveHubModeParam(modeRaw);
  const canViewNsfw = await resolveCanViewNsfw(await getAuthUserId());

  let channels: Awaited<ReturnType<typeof getLiveHubChannelFeed>>["channels"] = [];
  let hosts: Awaited<ReturnType<typeof getLiveHubChannelFeed>>["hosts"] = [];

  try {
    ({ channels, hosts } = await getLiveHubChannelFeed(category, mode));
    channels = filterNsfwChannels(channels, canViewNsfw);
  } catch {
    /* DB 미마이그레이션 */
  }

  return (
    <LiveChannelGrid channels={channels} hosts={hosts} filteredCategory={category} />
  );
}
