import { parseLiveCategoryParam } from "@/lib/live-categories";
import { getLiveHubChannelFeed } from "@/lib/live-hub-data";
import { LiveChannelGrid } from "@/components/live/live-channel-grid";

export async function LiveChannelFeed({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categoryRaw } = await searchParams;
  const category = parseLiveCategoryParam(categoryRaw);

  let channels: Awaited<ReturnType<typeof getLiveHubChannelFeed>>["channels"] = [];
  let hosts: Awaited<ReturnType<typeof getLiveHubChannelFeed>>["hosts"] = [];

  try {
    ({ channels, hosts } = await getLiveHubChannelFeed(category));
  } catch {
    /* DB 미마이그레이션 */
  }

  return <LiveChannelGrid channels={channels} hosts={hosts} />;
}
