import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { getCachedCommunities } from "@/lib/cached-data";
import { CommunitiesHubClient } from "@/components/communities/communities-hub-client";

export async function CommunitiesHubAsync() {
  let communities: Awaited<ReturnType<typeof getCachedCommunities>> = [];
  let loadError: string | null = null;
  try {
    communities = await getCachedCommunities();
  } catch (e) {
    console.error("[CommunitiesHubAsync]", e);
    loadError = t("communities.s23ajv4");
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
