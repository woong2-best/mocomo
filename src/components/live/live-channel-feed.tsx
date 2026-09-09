import { parseLiveCategoryParam } from "@/lib/live-categories";
import { parseLiveHubModeParam } from "@/lib/live-hub-mode";
import { getLiveHubChannelFeed } from "@/lib/live-hub-data";
import { LiveChannelGrid } from "@/components/live/live-channel-grid";
import { getAuthUserId } from "@/lib/auth";
import { filterNsfwChannels, resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";

function parseLiveHubViewParam(raw?: string | null): "explore" | "following" {
  return raw === "following" ? "following" : "explore";
}

export async function LiveChannelFeed({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; mode?: string; view?: string; q?: string }>;
}) {
  const { category: categoryRaw, mode: modeRaw, view: viewRaw, q: qRaw } = await searchParams;
  const category = parseLiveCategoryParam(categoryRaw);
  const mode = parseLiveHubModeParam(modeRaw);
  const view = parseLiveHubViewParam(viewRaw);
  const q = qRaw?.trim().toLowerCase() ?? "";
  const canViewNsfw = await resolveCanViewNsfw(await getAuthUserId());

  let channels: Awaited<ReturnType<typeof getLiveHubChannelFeed>>["channels"] = [];
  let hosts: Awaited<ReturnType<typeof getLiveHubChannelFeed>>["hosts"] = [];

  try {
    ({ channels, hosts } = await getLiveHubChannelFeed(category, mode));
    channels = filterNsfwChannels(channels, canViewNsfw);
    if (q) {
      const hostById = Object.fromEntries(hosts.map((h) => [h.id, h]));
      channels = channels.filter((ch) => {
        const host = hostById[ch.createdBy];
        return (
          ch.name.toLowerCase().includes(q) ||
          host?.username.toLowerCase().includes(q) ||
          (host?.name?.toLowerCase().includes(q) ?? false)
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
      filteredCategory={category}
      view={view}
    />
  );
}
