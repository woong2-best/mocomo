import { db } from "@/lib/db";
import {
  isComplimentaryCampaign,
  SPONSORED_AD_STATUS_ACTIVE,
  SPONSORED_AD_TARGET_POST,
} from "@/lib/sponsored-ad/constants";

export async function findActiveSponsoredPostIds(postIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(postIds.filter(Boolean))];
  if (unique.length === 0) return new Set();

  const now = new Date();
  const campaigns = await db.sponsoredAdCampaign.findMany({
    where: {
      targetType: SPONSORED_AD_TARGET_POST,
      targetId: { in: unique },
      status: SPONSORED_AD_STATUS_ACTIVE,
    },
    select: {
      targetId: true,
      expiresAt: true,
      mocoPaid: true,
      mocoPaidTenths: true,
    },
  });

  const active = new Set<string>();
  for (const campaign of campaigns) {
    if (isComplimentaryCampaign(campaign) || campaign.expiresAt > now) {
      active.add(campaign.targetId);
    }
  }
  return active;
}

export async function attachSponsoredAdFlags<T extends { id: string }>(
  posts: T[]
): Promise<(T & { sponsoredAdActive: boolean })[]> {
  const activeIds = await findActiveSponsoredPostIds(posts.map((p) => p.id));
  return posts.map((post) => ({
    ...post,
    sponsoredAdActive: activeIds.has(post.id),
  }));
}

export async function isPostSponsoredAdActive(postId: string): Promise<boolean> {
  const activeIds = await findActiveSponsoredPostIds([postId]);
  return activeIds.has(postId);
}
