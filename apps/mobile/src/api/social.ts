import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { FeedPost } from "@/api/feed";
import { normalizeProfileUsername } from "@/lib/profile-username";

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

export type SearchPageUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent?: string | null;
  bio: string | null;
  postsLocked?: boolean;
  isFollowing?: boolean;
  followsYou?: boolean;
};

export type SearchPageResult = {
  users: SearchPageUser[];
  postsTop: FeedPost[];
  postsLatest: FeedPost[];
  paymentsEnabled?: boolean;
};

export async function searchPage(q: string) {
  const params = new URLSearchParams({ q });
  return apiRequest<SearchPageResult>(`${MobileApi.searchPage}?${params}`, { auth: true });
}

export async function fetchPostDetail(id: string) {
  return apiRequest<{ post: FeedPost & { starred?: boolean } }>(MobileApi.post(id), {
    auth: true,
  });
}

export type CommentMediaType = "NONE" | "PHOTO" | "GIF";

export type CommentReplyToUser = {
  id: string;
  username: string;
} | null;

export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  likeCount?: number;
  liked?: boolean;
  likedByMe?: boolean;
  isPinned?: boolean;
  acceptedAt?: string | null;
  mediaType?: CommentMediaType | null;
  mediaUrl?: string | null;
  parentId?: string | null;
  replyCount?: number;
  replyToUser?: CommentReplyToUser;
  author: {
    id: string;
    username: string;
    name?: string | null;
    image: string | null;
  };
};

export async function fetchPostComments(postId: string, isQna = false) {
  const sort = isQna ? "oldest" : "ranked";
  return apiRequest<{
    comments?: CommentItem[];
    items?: CommentItem[];
    pinned?: CommentItem[];
    top?: CommentItem[];
    total?: number;
    postAuthorId?: string | null;
    nextCursor?: string | null;
    sort?: string;
  }>(`${MobileApi.postComments(postId)}?sort=${sort}&limit=40`, { auth: true });
}

export async function pinPostComment(commentId: string, pinned: boolean) {
  return apiRequest<{ ok: boolean; pinned: boolean }>(MobileApi.commentPin(commentId), {
    method: pinned ? "POST" : "DELETE",
  });
}

export async function acceptQnaAnswer(postId: string, commentId: string) {
  return apiRequest<{ ok: boolean }>(MobileApi.postAcceptAnswer(postId), {
    method: "POST",
    body: { commentId },
  });
}

export async function createPostComment(
  postId: string,
  content: string,
  media?: { mediaType: "PHOTO" | "GIF"; mediaUrl: string } | null,
  reply?: { parentId: string; replyToUserId?: string } | null
) {
  return apiRequest<{ comment: CommentItem }>(MobileApi.postComments(postId), {
    method: "POST",
    body: {
      content,
      parentId: reply?.parentId,
      replyToUserId: reply?.replyToUserId,
      mediaType: media?.mediaType ?? "NONE",
      mediaUrl: media?.mediaUrl ?? null,
    },
  });
}

export async function fetchCommentReplies(commentId: string, cursor?: string | null) {
  const qs = new URLSearchParams({ limit: "20" });
  if (cursor) qs.set("cursor", cursor);
  return apiRequest<{
    replies?: CommentItem[];
    nextCursor?: string | null;
  }>(`${MobileApi.commentReplies(commentId)}?${qs}`, { auth: true });
}

export type GiphyGifItem = {
  id: string;
  previewUrl: string;
  playUrl: string;
};

/** @deprecated Use GiphyGifItem */
export type TenorGifItem = GiphyGifItem;

export async function searchGiphyGifs(q = "") {
  const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  return apiRequest<{ items: GiphyGifItem[] }>(`${MobileApi.giphySearch}${params}`);
}

/** @deprecated Use searchGiphyGifs */
export async function searchTenorGifs(q = "") {
  return searchGiphyGifs(q);
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

export async function deleteOwnPost(postId: string) {
  return apiRequest<{ ok: boolean; authorUsername?: string }>(MobileApi.post(postId), {
    method: "DELETE",
  });
}

export type BlockedUserRow = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  blockedAt: string;
};

export async function fetchBlockedUsers() {
  const res = await apiRequest<{ users: BlockedUserRow[] }>(MobileApi.userBlock, {
    method: "GET",
    auth: true,
  });
  return Array.isArray(res.users) ? res.users : [];
}

export async function blockUser(userId: string) {
  return apiRequest<{ ok: boolean; blocked: boolean }>(MobileApi.userBlock, {
    method: "POST",
    body: { userId },
  });
}

export async function unblockUser(userId: string) {
  return apiRequest<{ ok: boolean; blocked: boolean }>(MobileApi.userBlock, {
    method: "DELETE",
    body: { userId },
    auth: true,
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
  | "SELF_HARM"
  | "FALSE_INFO"
  | "UNDERAGE"
  | "POLITICAL"
  | "REGULATED"
  | "OTHER";

export async function blockAndReportUser(params: {
  userId: string;
  username: string;
  postId?: string;
  reason: ReportReasonId;
  details?: string;
  reasonPath?: string;
}) {
  return apiRequest<{ ok: boolean; blocked: boolean; message: string }>(
    MobileApi.userBlockReport,
    {
      method: "POST",
      body: params,
    }
  );
}

export async function submitPostReport(params: {
  postId: string;
  reportedUserId: string;
  reason: ReportReasonId;
  reasonPath?: string;
  details?: string;
}) {
  return apiRequest<{ ok: boolean; message: string }>(MobileApi.reports, {
    method: "POST",
    body: {
      targetType: "POST",
      targetId: params.postId,
      postId: params.postId,
      reportedUserId: params.reportedUserId,
      reason: params.reason,
      reasonPath: params.reasonPath,
      details: params.details,
    },
  });
}

export async function submitCommentReport(params: {
  postId: string;
  commentId: string;
  reportedUserId: string;
  reason: ReportReasonId;
  reasonPath?: string;
  details?: string;
}) {
  return apiRequest<{ ok: boolean; message: string }>(MobileApi.reports, {
    method: "POST",
    body: {
      targetType: "COMMENT",
      targetId: params.commentId,
      postId: params.postId,
      commentId: params.commentId,
      reportedUserId: params.reportedUserId,
      reason: params.reason,
      reasonPath: params.reasonPath,
      details: params.details,
    },
  });
}

export async function toggleCommentLike(commentId: string, liked: boolean) {
  return apiRequest<{ ok: boolean; liked: boolean; likeCount: number }>(
    MobileApi.commentLike(commentId),
    { method: liked ? "DELETE" : "POST" }
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
  canMessage?: boolean;
  canCall?: boolean;
  paymentsEnabled?: boolean;
  creatorSubscriptionPriceKrw?: number | null;
  mutedByViewer?: boolean;
  postsLocked?: boolean;
  followRequested?: boolean;
  canViewPosts?: boolean;
  location?: string | null;
  website?: string | null;
  socialLinks?: import("@/features/profile/profile-social").ProfileSocialLink[];
};

export async function fetchUserProfile(username: string) {
  const handle = normalizeProfileUsername(username);
  return apiRequest<{
    user: ProfileUser;
    pinnedPost: FeedPost | null;
    posts: FeedPost[];
  }>(MobileApi.user(handle), { auth: true, timeoutMs: 25_000 });
}

export type FollowListTab = "followers" | "following";

export type ConnectionListUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  viewerFollows: boolean;
};

export async function fetchUserConnections(
  username: string,
  type: FollowListTab,
  cursor?: string
) {
  const params = new URLSearchParams({ type });
  if (cursor) params.set("cursor", cursor);
  return apiRequest<{
    users: ConnectionListUser[];
    nextCursor: string | null;
    profileUsername: string;
  }>(`${MobileApi.userConnections(username)}?${params}`, { auth: true });
}

export async function toggleFollowUser(userId: string) {
  return apiRequest<{
    following?: boolean;
    requested?: boolean;
    pending?: boolean;
    error?: string;
  }>(MobileApi.follow, {
    method: "POST",
    body: { userId },
  });
}

export type IncomingFollowRequest = {
  id: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    bio: string | null;
  };
};

export async function fetchFollowRequests() {
  return apiRequest<{ requests: IncomingFollowRequest[] }>(MobileApi.followRequests, {
    auth: true,
  });
}

export async function actOnFollowRequest(requesterId: string, action: "approve" | "reject") {
  return apiRequest<{ ok: boolean }>(MobileApi.followRequests, {
    method: "POST",
    body: { requesterId, action },
    auth: true,
  });
}
