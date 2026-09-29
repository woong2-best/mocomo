import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type QuotePreviewPost = {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  isNsfw: boolean;
  author: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  media: { url: string; type: string; posterUrl: string | null; duration: number | null }[];
};

export async function fetchQuotePreview(postId: string) {
  return apiRequest<{ post: QuotePreviewPost }>(
    `/api/posts/${encodeURIComponent(postId)}/quote-preview`,
    { auth: true }
  );
}

export type CreatePostPollPayload = {
  options: string[];
  durationMinutes: number;
};

export async function voteOnPostPoll(postId: string, optionId: string) {
  return apiRequest<{ poll: import("@/api/feed").FeedPoll }>(MobileApi.postPollVote(postId), {
    method: "POST",
    body: { optionId },
  });
}

export async function createPost(input: {
  content: string;
  media?: { url: string; type: "IMAGE" | "VIDEO"; width?: number; height?: number; duration?: number }[];
  poll?: CreatePostPollPayload;
  collaboratorUserIds?: string[];
  isNsfw?: boolean;
  communityId?: string;
  isAnonymous?: boolean;
  quotedPostId?: string;
}) {
  return apiRequest<{ postId: string; warning?: string }>(MobileApi.postsCreate, {
    method: "POST",
    body: {
      content: input.content,
      media: input.media ?? [],
      poll: input.poll,
      collaboratorUserIds: input.collaboratorUserIds ?? [],
      isNsfw: input.isNsfw ?? false,
      ...(input.communityId ? { communityId: input.communityId, isAnonymous: true } : {}),
      ...(input.quotedPostId ? { quotedPostId: input.quotedPostId } : {}),
    },
  });
}

export async function requestUpload(input: {
  filename: string;
  contentType: string;
  category: "image" | "video" | "audio";
}) {
  return apiRequest<{
    uploadUrl?: string;
    publicUrl?: string;
    url?: string;
    key?: string;
    token?: string;
  }>(MobileApi.upload, {
    method: "POST",
    body: input,
  });
}
