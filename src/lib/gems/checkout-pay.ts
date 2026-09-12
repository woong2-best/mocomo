import type { PaymentIntentType } from "@prisma/client";
import {
  spendGemsOnLiveTip,
  spendGemsOnPostMedia,
  spendGemsOnProfileTip,
} from "@/lib/gems/spend-bridge";

const GEM_ELIGIBLE: PaymentIntentType[] = ["TIP", "POST_MEDIA"];

export async function payCheckoutWithGems(input: {
  userId: string;
  type: PaymentIntentType;
  amountUsdCents: number;
  metadata: Record<string, unknown>;
}) {
  if (!GEM_ELIGIBLE.includes(input.type)) {
    return { error: "MOCO로 결제할 수 없는 유형입니다." as const };
  }

  const gems = input.amountUsdCents;
  if (!Number.isInteger(gems) || gems <= 0) {
    return { error: "유효하지 않은 결제 금액입니다." as const };
  }

  if (input.type === "POST_MEDIA") {
    const mediaId = String(input.metadata.mediaId ?? "");
    if (!mediaId) return { error: "미디어 정보가 없습니다." as const };
    return spendGemsOnPostMedia({ fanId: input.userId, mediaId, gems });
  }

  const receiverId = String(input.metadata.receiverId ?? "");
  if (!receiverId) return { error: "후원 대상이 없습니다." as const };

  const message = typeof input.metadata.message === "string" ? input.metadata.message : undefined;
  const channelId =
    typeof input.metadata.channelId === "string" ? input.metadata.channelId.trim() : undefined;

  if (channelId) {
    return spendGemsOnLiveTip({
      fanId: input.userId,
      creatorId: receiverId,
      channelId,
      gems,
      message,
    });
  }

  return spendGemsOnProfileTip({
    fanId: input.userId,
    creatorId: receiverId,
    gems,
    message,
    channelId,
  });
}
