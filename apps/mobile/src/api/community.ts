import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { FeedPage } from "@/api/feed";

export type CommunityListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  category: string;
  customCategoryLabel?: string | null;
  isNsfw: boolean;
  memberCount: number;
  joinMode: string;
};

export type CommunityPostPreview = {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  isNsfw: boolean;
  isPinned?: boolean;
  viewCount?: number;
  author: { id: string; username: string; name?: string | null; image: string | null };
  likeCount: number;
  commentCount: number;
};

export type CommunityDetail = CommunityListItem & {
  createdAt: string;
  isMember: boolean;
  role: string | null;
  isOwner: boolean;
  canEditIcon: boolean;
  canEditBanner: boolean;
  hasJoinPassword?: boolean;
  posts: CommunityPostPreview[];
};

export type CommunityChannelItem = {
  id: string;
  slug: string;
  name: string;
  type: string;
  position: number;
  chatRoomId: string | null;
  categoryName: string | null;
};

export async function fetchCommunityList(q?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("take", "80");
  const suffix = `?${params}`;
  return apiRequest<{ items: CommunityListItem[] }>(`${MobileApi.community}${suffix}`, {
    auth: true,
  });
}

export async function fetchQnaFeedPage(opts?: {
  cursor?: string | null;
  limit?: number;
  q?: string;
  category?: string;
}): Promise<FeedPage> {
  const params = new URLSearchParams();
  params.set("limit", String(opts?.limit ?? 12));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.category && opts.category !== "ALL") params.set("category", opts.category);
  const page = await apiRequest<FeedPage>(`${MobileApi.communityFeed}?${params.toString()}`, {
    auth: true,
  });
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

export async function createCommunity(input: {
  name: string;
  description?: string;
  category: string;
  customCategoryLabel?: string;
  isNsfw?: boolean;
}) {
  return apiRequest<{ community: { id: string; slug: string; name: string } }>(
    MobileApi.community,
    {
      method: "POST",
      body: input,
    }
  );
}

export async function fetchCommunityDetail(slug: string) {
  return apiRequest<{ item: CommunityDetail }>(
    `${MobileApi.community}/${encodeURIComponent(slug)}`,
    { auth: true }
  );
}

export async function updateCommunityBranding(
  slug: string,
  data: { iconUrl?: string | null; coverUrl?: string | null; bannerUrl?: string | null; bannerVideoUrl?: string | null }
) {
  return apiRequest<{
    success: boolean;
    iconUrl: string | null;
    coverUrl: string | null;
    bannerUrl: string | null;
    bannerVideoUrl: string | null;
  }>(`${MobileApi.community}/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: data,
  });
}

export async function joinCommunity(slug: string, inviteCode?: string, joinPassword?: string) {
  return apiRequest<{
    success: boolean;
    isMember?: boolean;
    pending?: boolean;
    message?: string;
    memberCount?: number;
  }>(`${MobileApi.community}/${encodeURIComponent(slug)}/join`, {
    method: "POST",
    body: {
      ...(inviteCode ? { inviteCode } : {}),
      ...(joinPassword ? { joinPassword } : {}),
    },
  });
}

export async function fetchCommunityChannels(slug: string) {
  return apiRequest<{
    community: { id: string; slug: string; name: string };
    items: CommunityChannelItem[];
  }>(`${MobileApi.community}/${encodeURIComponent(slug)}/channels`, { auth: true });
}

export async function openCommunityChannel(slug: string, channelSlug: string) {
  return apiRequest<{
    roomId: string;
    channel: { id: string; slug: string; name: string; type: string };
  }>(`${MobileApi.community}/${encodeURIComponent(slug)}/channels`, {
    method: "POST",
    body: { channelSlug },
  });
}
