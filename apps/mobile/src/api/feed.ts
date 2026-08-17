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
};

export type FeedPage = {
  items: { type: "post"; data: FeedPost }[];
  nextCursor: string | null;
  likedIds: string[];
  starredIds: string[];
  repostedIds: string[];
  paymentsEnabled?: boolean;
  error?: string;
};

export async function fetchFeedPage(cursor?: string | null, limit = 12): Promise<FeedPage> {
  const q = new URLSearchParams();
  if (cursor) q.set("cursor", cursor);
  q.set("limit", String(limit));
  const path = `${MobileApi.feed}?${q.toString()}`;
  const page = await apiRequest<FeedPage>(path, { auth: true });
  const liked = new Set(page.likedIds ?? []);
  const starred = new Set(page.starredIds ?? []);
  const reposted = new Set(page.repostedIds ?? []);
  return {
    ...page,
    items: (page.items ?? []).map((item) => ({
      ...item,
      data: {
        ...item.data,
        liked: liked.has(item.data.id),
        starred: starred.has(item.data.id),
        reposted: reposted.has(item.data.id),
      },
    })),
  };
}

export async function togglePostLike(postId: string) {
  return apiRequest<{ liked: boolean; likeCount: number }>(MobileApi.postLike(postId), {
    method: "POST",
  });
}
