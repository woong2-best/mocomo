/** Flower Gift — cash-value digital gift assets */

export const FLOWER_REDEEM_FEE_BPS = 1500; // 15%

export const FLOWER_RISK_HOLD_THRESHOLD = 70;

export const FLOWER_BUY_VELOCITY_PER_HOUR = 8;
export const FLOWER_GIFT_VELOCITY_PER_HOUR = 15;
export const FLOWER_NEW_ACCOUNT_HIGH_VALUE_KRW = 50_000;
export const FLOWER_NEW_ACCOUNT_DAYS = 3;

export function flowerRedeemFee(faceValueKrw: number, feeBps = FLOWER_REDEEM_FEE_BPS) {
  const feeAmountKrw = Math.floor((faceValueKrw * feeBps) / 10_000);
  const netAmountKrw = Math.max(0, faceValueKrw - feeAmountKrw);
  return { feeAmountKrw, netAmountKrw, feeBps };
}

export const FLOWER_CONTEXT_LABELS: Record<string, string> = {
  LIVE: "라이브",
  POST: "게시글",
  COMMENT: "댓글",
  MESSAGE: "채팅",
  PROFILE: "프로필",
  DIRECT: "직접 선물",
  OTHER: "기타",
};
