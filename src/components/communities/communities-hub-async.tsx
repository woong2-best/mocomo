import { getCachedCommunities } from "@/lib/cached-data";
import { CommunitiesHubClient } from "@/components/communities/communities-hub-client";

export async function CommunitiesHubAsync() {
  let communities: Awaited<ReturnType<typeof getCachedCommunities>> = [];
  try {
    communities = await getCachedCommunities();
  } catch {
    communities = [];
  }

  return (
    <CommunitiesHubClient
      communities={communities.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        memberCount: c.memberCount,
        iconUrl: c.iconUrl,
        bannerUrl: c.bannerUrl,
        category: c.category,
        isNsfw: c.isNsfw,
      }))}
    />
  );
}
