import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type FeedMedia = {
  id?: string;
  url: string;
  type: string;
  priceKrw?: number | null;
  locked?: boolean;
  lockReason?: string | null;
  instantPurchasePriceKrw?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  hlsUrl?: string | null;
  posterUrl?: string | null;
  streamUid?: string | null;
};

export type FeedPost = {
  id: string;
  title: string | null;
  content: string;
  postType: string;
  createdAt: string;
  isNsfw: boolean;
  visibility?: string | null;
  instantPurchasePriceKrw?: number | null;
  subscribedToAuthor?: boolean;
  paymentsEnabled?: boolean;
  author: {
    id: string;
    username: string;
    name?: string | null;
    image: string | null;
    creatorSubscriptionPriceKrw?: number | null;
    supportTierSent?: string | null;
    earnedMocoTier?: string | null;
  };
  media: FeedMedia[];
  _count: {
    likes: number;
    comments: number;
    votes?: number;
    reposts?: number;
  };
  liked?: boolean;
  starred?: boolean;
  reposted?: boolean;
  viewCount?: number;
  anime?: { title: string; slug: string } | null;
  communityId?: string | null;
  community?: {
    slug: string;
    name: string;
    category?: string;
    customCategoryLabel?: string | null;
  } | null;
  isAnonymous?: boolean;
  poll?: FeedPoll | null;
  repostBy?: {
    id: string;
    createdAt: string;
    user: { id: string; username: string; name?: string | null; image: string | null };
  } | null;
  quotedPost?: {
    id: string;
    title?: string | null;
    content: string;
    createdAt: string;
    isNsfw?: boolean;
    author: { id: string; username: string; name?: string | null; image: string | null };
    media?: { url: string; type: string; posterUrl?: string | null; duration?: number | null }[];
  } | null;
  quotedPostBlocked?: boolean;
  activityKey?: string;
  activityAt?: string;
  /** Viewer’s profile-main slot (own posts only). */
  profilePinned?: boolean;
  isPinned?: boolean;
};

export type FeedPoll = {
  id: string;
  closesAt: string;
  closed: boolean;
  options: { id: string; label: string; count: number }[];
  totalVotes: number;
  myVoteOptionId?: string | null;
};

export type FeedAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
  adCategory?: string | null;
};

export type FeedItem =
  | { type: "post"; data: FeedPost }
  | { type: "ad"; data: FeedAd };

export type FeedPage = {
  items: FeedItem[];
  nextCursor: string | null;
  likedIds: string[];
  starredIds: string[];
  repostedIds: string[];
  paymentsEnabled?: boolean;
  error?: string;
};

export async function fetchFeedPage(
  cursor?: string | null,
  limit = 12,
  postOffset = 0
): Promise<FeedPage> {
  const q = new URLSearchParams();
  if (cursor) q.set("cursor", cursor);
  q.set("limit", String(limit));
  if (postOffset > 0) q.set("postOffset", String(postOffset));
  const path = `${MobileApi.feed}?${q.toString()}`;
  const page = await apiRequest<FeedPage>(path, { auth: true });
  const liked = new Set(page.likedIds ?? []);
  const starred = new Set(page.starredIds ?? []);
  const reposted = new Set(page.repostedIds ?? []);
  return {
    ...page,
    items: (page.items ?? []).map((item) =>
      item.type === "ad"
        ? item
        : {
            ...item,
            data: {
              ...item.data,
              liked: liked.has(item.data.id),
              starred: starred.has(item.data.id),
              reposted: reposted.has(item.data.id),
            },
          }
    ),
  };
}

export async function togglePostLike(postId: string) {
  return apiRequest<{ liked: boolean; likeCount: number }>(MobileApi.postLike(postId), {
    method: "POST",
  });
}
