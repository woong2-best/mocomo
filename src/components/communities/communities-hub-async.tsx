import { getCachedCommunities } from "@/lib/cached-data";
import { CommunitiesHubClient } from "@/components/communities/communities-hub-client";

export async function CommunitiesHubAsync() {
  let communities: Awaited<ReturnType<typeof getCachedCommunities>> = [];
  let loadError: string | null = null;
  try {
    communities = await getCachedCommunities();
  } catch (e) {
    console.error("[CommunitiesHubAsync]", e);
    loadError = "커뮤니티 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return (
    <CommunitiesHubClient
      loadError={loadError}
      communities={communities.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        memberCount: c.memberCount,
        iconUrl: c.iconUrl,
        coverUrl: c.coverUrl,
        bannerUrl: c.bannerUrl,
        category: c.category,
        customCategoryLabel: c.customCategoryLabel,
        isNsfw: c.isNsfw,
      }))}
    />
  );
}
