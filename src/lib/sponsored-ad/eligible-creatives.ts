import { db } from "@/lib/db";
import { excerptPostText, firstBoostImageUrl } from "@/lib/sponsored-ad/boostable";
import {
  SPONSORED_AD_STATUS_ACTIVE,
  SPONSORED_AD_TARGET_POST,
} from "@/lib/sponsored-ad/constants";
import { listEligibleSponsorEvents } from "@/lib/sponsored-ad/eligible-events";

export type SponsorCreative = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  authorName?: string;
  excerpt?: string;
  ctaLabel?: string;
  kind: "post" | "event";
  postId?: string;
};

function adTitleFromLink(linkUrl: string): string {
  try {
    const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return "Ad";
  }
}

export async function listEligibleBoostedPosts(): Promise<SponsorCreative[]> {
  const now = new Date();
  const campaigns = await db.sponsoredAdCampaign.findMany({
    where: {
      targetType: SPONSORED_AD_TARGET_POST,
      status: SPONSORED_AD_STATUS_ACTIVE,
      startsAt: { lte: now },
      OR: [{ expiresAt: { gte: now } }, { mocoPaid: 0, mocoPaidTenths: 0 }],
    },
    select: { targetId: true },
    take: 60,
  });
  const ids = [...new Set(campaigns.map((c) => c.targetId))];
  if (ids.length === 0) return [];

  const posts = await db.post.findMany({
    where: {
      id: { in: ids },
      visibility: "PUBLIC",
    },
    select: {
      id: true,
      content: true,
      title: true,
      author: { select: { name: true, username: true } },
      media: {
        where: { type: "IMAGE" },
        orderBy: { order: "asc" },
        take: 1,
        select: { url: true, type: true },
      },
    },
  });

  const out: SponsorCreative[] = [];
  for (const p of posts) {
    const imageUrl = firstBoostImageUrl(p.media);
    if (!imageUrl) continue;
    const excerpt = excerptPostText(p.content || p.title || "");
    const authorName = p.author.name?.trim() || p.author.username;
    out.push({
      id: `post-${p.id}`,
      title: excerpt || authorName,
      imageUrl,
      linkUrl: `/post/${p.id}`,
      authorName,
      excerpt,
      ctaLabel: "View post",
      kind: "post",
      postId: p.id,
    });
  }
  return out;
}

export async function listEligibleSponsorCreatives(): Promise<SponsorCreative[]> {
  const [posts, events] = await Promise.all([
    listEligibleBoostedPosts(),
    listEligibleSponsorEvents(),
  ]);

  const eventAds: SponsorCreative[] = events
    .filter((e): e is typeof e & { imageUrl: string } => !!e.imageUrl?.trim())
    .map((e) => {
      const link = e.linkUrl?.trim() || "/events";
      return {
        id: `event-${e.id}`,
        title: e.linkUrl?.trim() ? adTitleFromLink(e.linkUrl) : e.title,
        imageUrl: e.imageUrl,
        linkUrl: link,
        authorName: e.createdBy?.name || e.createdBy?.username || "MoCoMo",
        excerpt: e.title,
        ctaLabel: "Go to",
        kind: "event" as const,
      };
    });

  return [...posts, ...eventAds];
}
