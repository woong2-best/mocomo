import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { FeedPost } from "@/api/feed";

export type SearchResult = {
  users: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  }[];
  posts: {
    id: string;
    title: string | null;
    content: string;
  }[];
  animes: {
    slug: string;
    title: string;
    titleEn: string | null;
    coverUrl: string | null;
  }[];
  liveStreams: {
    id: string;
    name: string;
    category: string;
  }[];
};

export async function searchAll(q: string) {
  const params = new URLSearchParams({ q });
  return apiRequest<SearchResult>(`${MobileApi.search}?${params}`, { auth: true });
}

export async function fetchPostDetail(id: string) {
  return apiRequest<{ post: FeedPost & { starred?: boolean } }>(MobileApi.post(id), {
    auth: true,
  });
}

export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  likeCount?: number;
  liked?: boolean;
  author: {
    id: string;
    username: string;
    name?: string | null;
    image: string | null;
  };
};

export async function fetchPostComments(postId: string) {
  return apiRequest<{
    comments?: CommentItem[];
    items?: CommentItem[];
    total?: number;
  }>(`${MobileApi.postComments(postId)}?sort=newest&limit=40`, { auth: true });
}

export async function createPostComment(postId: string, content: string) {
  return apiRequest<{ comment: CommentItem }>(MobileApi.postComments(postId), {
    method: "POST",
    body: { content },
  });
}

export async function togglePostStar(postId: string) {
  return apiRequest<{ starred: boolean }>(MobileApi.postStar(postId), {
    method: "POST",
  });
}

export async function togglePostRepost(postId: string) {
  return apiRequest<{ reposted: boolean; repostCount: number }>(MobileApi.postRepost(postId), {
    method: "POST",
  });
}

export async function togglePostProfileFeature(postId: string) {
  return apiRequest<{ featured: boolean }>(MobileApi.postProfileFeature(postId), {
    method: "POST",
  });
}

export async function toggleMuteUser(userId: string, username: string) {
  return apiRequest<{ muted: boolean }>(MobileApi.userMute, {
    method: "POST",
    body: { userId, username },
  });
}

export type ReportReasonId =
  | "SPAM"
  | "ABUSE"
  | "HARASSMENT"
  | "HATE"
  | "VIOLENCE"
  | "FRAUD"
  | "PRIVACY"
  | "COPYRIGHT"
  | "SEXUAL"
  | "IMPERSONATION"
  | "OTHER";

export async function blockAndReportUser(params: {
  userId: string;
  username: string;
  postId?: string;
  reason: ReportReasonId;
  details?: string;
}) {
  return apiRequest<{ ok: boolean; blocked: boolean; message: string }>(
    MobileApi.userBlockReport,
    {
      method: "POST",
      body: params,
    }
  );
}

export type ProfileUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  countryCode?: string | null;
  createdAt: string;
  counts: { posts: number; followers: number; following: number };
  following: boolean;
  subscribed?: boolean;
  isSelf: boolean;
  paymentsEnabled?: boolean;
  creatorSubscriptionPriceKrw?: number | null;
};

export async function fetchUserProfile(username: string) {
  return apiRequest<{
    user: ProfileUser;
    posts: FeedPost[];
  }>(MobileApi.user(username), { auth: true });
}

export async function toggleFollowUser(userId: string) {
  return apiRequest<{ following?: boolean; pending?: boolean; error?: string }>(
    MobileApi.follow,
    {
      method: "POST",
      body: { userId },
    }
  );
}
