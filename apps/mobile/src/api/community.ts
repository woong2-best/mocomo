import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type CommunityListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  category: string;
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
  author: { id: string; username: string; image: string | null };
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

export async function createCommunity(input: {
  name: string;
  description?: string;
  category: string;
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

export async function joinCommunity(slug: string, inviteCode?: string) {
  return apiRequest<{
    success: boolean;
    isMember?: boolean;
    pending?: boolean;
    message?: string;
    memberCount?: number;
  }>(`${MobileApi.community}/${encodeURIComponent(slug)}/join`, {
    method: "POST",
    body: inviteCode ? { inviteCode } : {},
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
