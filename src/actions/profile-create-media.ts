"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createPostForUser } from "@/lib/create-post-core";
import { parseContentVisibility } from "@/lib/creator-subscription";
import { SETTLEMENT_ACCOUNT_REQUIRED_CODE } from "@/lib/settlement-account";
import type { MediaType } from "@prisma/client";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";
import {
  formatUsd,
  SALE_MEDIA_MAX_PRICE_USD_CENTS,
  SALE_MEDIA_MIN_PRICE_USD_CENTS,
} from "@/lib/money";

export async function createProfileMediaPost(input: {
  content: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  priceKrw?: number;
  visibility?: string;
  instantPurchasePriceKrw?: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}) {
  const user = await requireAuth();
  const content = input.content?.trim();
  const mediaUrl = input.mediaUrl?.trim();
  if (!content) return { error: "내용을 입력해 주세요." };
  if (!mediaUrl) return { error: "사진 또는 영상을 추가해 주세요." };

  const visibility = parseContentVisibility(input.visibility);
  const mediaPrice = Math.max(0, Math.floor(input.priceKrw ?? 0));
  const instantPurchasePriceKrw = Math.max(0, Math.floor(input.instantPurchasePriceKrw ?? 0));

  if (mediaPrice > 0 && mediaPrice < SALE_MEDIA_MIN_PRICE_USD_CENTS) {
    return { error: `유료 판매 가격은 최소 ${formatUsd(SALE_MEDIA_MIN_PRICE_USD_CENTS)}부터 설정할 수 있습니다.` };
  }
  if (instantPurchasePriceKrw > 0 && instantPurchasePriceKrw < SALE_MEDIA_MIN_PRICE_USD_CENTS) {
    return { error: `즉시 구매 가격은 최소 ${formatUsd(SALE_MEDIA_MIN_PRICE_USD_CENTS)}부터 설정할 수 있습니다.` };
  }
  if (mediaPrice > SALE_MEDIA_MAX_PRICE_USD_CENTS || instantPurchasePriceKrw > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
    return { error: `가격은 ${formatUsd(SALE_MEDIA_MAX_PRICE_USD_CENTS)} 이하로 설정해 주세요.` };
  }

  const mediaType: MediaType = input.mediaType === "VIDEO" ? "VIDEO" : "IMAGE";

  const result = await createPostForUser(user, {
    content,
    visibility,
    instantPurchasePriceKrw,
    media: [
      {
        url: mediaUrl,
        type: mediaType,
        priceKrw: mediaPrice,
        width: input.width,
        height: input.height,
        duration: input.duration,
      },
    ],
  });

  if (result.error) {
    if ("code" in result && result.code === SETTLEMENT_ACCOUNT_REQUIRED_CODE) {
      return result;
    }
    return { error: result.error };
  }

  if (user.username) {
    revalidatePath(`/u/${user.username}`);
  }
  revalidatePath(COMMUNITY_FEED_PATH);

  return { success: true as const, postId: result.postId };
}
