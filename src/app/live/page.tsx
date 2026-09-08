import { Suspense } from "react";
import { LiveHub } from "@/components/live/live-hub";
import { LiveChannelFeed } from "@/components/live/live-channel-feed";
import { LiveChannelGridSkeleton } from "@/components/live/live-channel-grid-skeleton";
import { getLiveHubStaticData } from "@/lib/live-hub-data";
import { autoEndAbandonedLiveChannels } from "@/lib/live-abandon";
import { getAuthUserId } from "@/lib/auth";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { LiveFeatureDisabledNotice } from "@/components/live/live-feature-disabled";
import { filterNsfwChannels, resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";

export const revalidate = 25;

function parseLiveHubViewParam(raw?: string | null): "explore" | "following" {
  return raw === "following" ? "following" : "explore";
}

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; mode?: string; notice?: string; view?: string }>;
}) {
  if (!isLiveFeatureEnabled()) {
    return <LiveFeatureDisabledNotice />;
  }

  const params = await searchParams;
  const view = parseLiveHubViewParam(params.view);
  const currentUserId = await getAuthUserId();
  const canViewNsfw = await resolveCanViewNsfw(currentUserId);
  void autoEndAbandonedLiveChannels();

  let staticData: Awaited<ReturnType<typeof getLiveHubStaticData>> = {
    recommendedStreamers: [],
    followedLive: [],
    followedHosts: [],
    scheduledStreams: [],
  };

  try {
    staticData = await getLiveHubStaticData(currentUserId);
    staticData = {
      ...staticData,
      followedLive: filterNsfwChannels(staticData.followedLive, canViewNsfw),
    };
  } catch {
    /* DB 미마이그레이션 시 빈 허브 */
  }

  return (
    <LiveHub
      recommendedStreamers={staticData.recommendedStreamers}
      followedLive={staticData.followedLive}
      followedHosts={staticData.followedHosts}
      scheduledStreams={staticData.scheduledStreams}
      currentUserId={currentUserId ?? undefined}
      view={view}
      channelFeed={
        <Suspense fallback={<LiveChannelGridSkeleton />}>
          <LiveChannelFeed searchParams={Promise.resolve(params)} />
        </Suspense>
      }
    />
  );
}
