import { Suspense } from "react";
import { LiveHub } from "@/components/live/live-hub";
import { getLiveHubData } from "@/lib/live-hub-data";
import { parseLiveCategoryParam } from "@/lib/live-categories";

export const revalidate = 25;

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categoryRaw } = await searchParams;
  const category = parseLiveCategoryParam(categoryRaw);

  let data: Awaited<ReturnType<typeof getLiveHubData>> = {
    channels: [],
    hosts: [],
    recommendedStreamers: [],
    popularClips: [],
    followedLive: [],
  };

  try {
    data = await getLiveHubData(category);
  } catch {
    /* DB 미마이그레이션 시 빈 허브 */
  }

  return (
    <Suspense>
      <LiveHub
        channels={data.channels}
        hosts={data.hosts}
        recommendedStreamers={data.recommendedStreamers}
        popularClips={data.popularClips}
        followedLive={data.followedLive}
      />
    </Suspense>
  );
}
