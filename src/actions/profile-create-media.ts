"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createPostForUser } from "@/lib/create-post-core";
import type { MediaType } from "@prisma/client";

export async function createProfileMediaPost(input: {
  content: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  priceKrw?: number;
}) {
  const user = await requireAuth();
  const content = input.content?.trim();
  const mediaUrl = input.mediaUrl?.trim();
  if (!content) return { error: "내용을 입력해 주세요." };
  if (!mediaUrl) return { error: "사진 또는 영상을 추가해 주세요." };

  const priceKrw = Math.max(0, Math.floor(input.priceKrw ?? 0));
  if (priceKrw > 0 && priceKrw < 100) {
    return { error: "유료 콘텐츠는 최소 100원부터 설정할 수 있습니다." };
  }
  if (priceKrw > 1_000_000) {
    return { error: "유료 콘텐츠 가격은 100만원 이하로 설정해 주세요." };
  }

  const mediaType: MediaType = input.mediaType === "VIDEO" ? "VIDEO" : "IMAGE";

  const result = await createPostForUser(user, {
    content,
    media: [{ url: mediaUrl, type: mediaType, priceKrw }],
  });

  if (result.error) return { error: result.error };

  if (user.username) {
    revalidatePath(`/u/${user.username}`);
  }
  revalidatePath("/");

  return { success: true as const, postId: result.postId };
}
