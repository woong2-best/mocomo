import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type CreatePostPollPayload = {
  options: string[];
  durationMinutes: number;
};

export async function createPost(input: {
  content: string;
  media?: { url: string; type: "IMAGE" | "VIDEO"; width?: number; height?: number; duration?: number }[];
  poll?: CreatePostPollPayload;
  collaboratorUserIds?: string[];
  isNsfw?: boolean;
}) {
  return apiRequest<{ postId: string; warning?: string }>(MobileApi.postsCreate, {
    method: "POST",
    body: {
      content: input.content,
      media: input.media ?? [],
      poll: input.poll,
      collaboratorUserIds: input.collaboratorUserIds ?? [],
      isNsfw: input.isNsfw ?? false,
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
