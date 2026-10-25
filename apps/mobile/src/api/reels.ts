import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

import type { PaidMediaMonetization } from "@/components/media/paid-media-types";

export type ReelItem = {
  id: string;
  postId: string;
  title: string | null;
  content: string;
  createdAt: string;
  isNsfw: boolean;
  viewCount: number;
  author: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  collaborators?: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  }[];
  mediaType?: "IMAGE" | "VIDEO" | "NOTE";
  /** One already-wrapped page when mediaType is NOTE. */
  noteText?: string;
  media: {
    id: string;
    url: string;
    hlsUrl: string | null;
    posterUrl: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
    priceKrw: number;
    locked?: boolean;
    lockReason?: string | null;
    instantPurchasePriceKrw?: number | null;
  };
  monetization?: PaidMediaMonetization;
  likeCount: number;
  commentCount: number;
  repostCount?: number;
  liked: boolean;
  starred: boolean;
  reposted?: boolean;
};

export type ReelsPage = {
  items: ReelItem[];
  nextCursor: string | null;
  error?: string;
};

export async function fetchReelsPage(cursor?: string | null, limit = 8): Promise<ReelsPage> {
  const q = new URLSearchParams();
  if (cursor) q.set("cursor", cursor);
  q.set("limit", String(limit));
  return apiRequest<ReelsPage>(`${MobileApi.reels}?${q.toString()}`, { auth: true });
}
