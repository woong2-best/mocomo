import { Suspense } from "react";
import { LiveHub } from "@/components/live/live-hub";
import { LiveChannelFeed } from "@/components/live/live-channel-feed";
import { LiveChannelGridSkeleton } from "@/components/live/live-channel-grid-skeleton";
import { getLiveHubStaticData } from "@/lib/live-hub-data";
import { autoEndAbandonedLiveChannels } from "@/lib/live-abandon";
import { getAuthUserId } from "@/lib/auth";
import {
  isExternalLiveEnabled,
  isFirstPartyLiveEnabled,
  isLiveFeatureEnabled,
} from "@/lib/live-feature";
import { LiveFeatureDisabledNotice } from "@/components/live/live-feature-disabled";
import Link from "next/link";

export const revalidate = 25;

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; mode?: string; notice?: string }>;
}) {
  if (!isLiveFeatureEnabled()) {
    return <LiveFeatureDisabledNotice />;
  }

  const sp = await searchParams;
  const currentUserId = await getAuthUserId();
  void autoEndAbandonedLiveChannels();

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

  const showEndedNotice =
    sp.notice === "first-party-ended" || !isFirstPartyLiveEnabled();

  return (
    <>
      {showEndedNotice ? (
        <div className="mx-auto max-w-5xl px-3 pt-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-medium">자체 송출(MoCoMo 서버 방송)이 종료되었습니다.</p>
            <p className="mt-1 text-muted-foreground">
              유튜브·트위치 등 외부 방송을 연결해 채팅·후원을 MoCoMo에서 이용할 수 있습니다. 제휴
              서비스가 아닙니다.
              {isExternalLiveEnabled() ? (
                <>
                  {" "}
                  <Link href="/live/external/new" className="underline font-medium text-foreground">
                    외부 방송 연결
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}
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
    </>
  );
}
