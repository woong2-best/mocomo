import type { SupportTierLevel } from "@prisma/client";
import { resolveProfileDisplayTier } from "@/lib/settlement-moco/balance";

type UserTierFields = {
  supportTierSent: SupportTierLevel;
  earnedMocoTier?: SupportTierLevel | null;
};

/** 프로필·피드·채팅 뱃지 — 보낸 등급 + earned 정산 등급 중 높은 쪽 */
export function profileDisplayTier(user: UserTierFields): SupportTierLevel {
  return resolveProfileDisplayTier(
    user.supportTierSent,
    user.earnedMocoTier ?? "SEED"
  );
}
