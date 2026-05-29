import { Suspense } from "react";
import { LiveHub } from "@/components/live/live-hub";
import { LiveChannelFeed } from "@/components/live/live-channel-feed";
import { LiveChannelGridSkeleton } from "@/components/live/live-channel-grid-skeleton";
import { getLiveHubStaticData } from "@/lib/live-hub-data";
import { getAuthUserId } from "@/lib/auth";

export const revalidate = 25;

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const currentUserId = await getAuthUserId();

  let staticData: Awaited<ReturnType<typeof getLiveHubStaticData>> = {
    recommendedStreamers: [],
    followedLive: [],
    followedHosts: [],
    scheduledStreams: [],
  };

  try {
    staticData = await getLiveHubStaticData(currentUserId);
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
      channelFeed={
        <Suspense fallback={<LiveChannelGridSkeleton />}>
          <LiveChannelFeed searchParams={searchParams} />
        </Suspense>
      }
    />
  );
}
