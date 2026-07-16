/** Flower Gift — cash-value digital gift assets */

export const FLOWER_REDEEM_FEE_BPS = 1000; // 10%
export const FLOWER_REDEEM_NET_RATIO = (10_000 - FLOWER_REDEEM_FEE_BPS) / 10_000;

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

export const FLOWER_CATALOG_PRESET = [
  {
    slug: "rose",
    nameKo: "로즈",
    nameEn: "Rose",
    emoji: "🌹",
    priceKrw: 50_000,
    defaultMessage: "항상 응원합니다.",
    animationKey: "bloom-soft",
    sortOrder: 10,
  },
  {
    slug: "cherry-blossom",
    nameKo: "벚꽃",
    nameEn: "Cherry Blossom",
    emoji: "🌸",
    priceKrw: 100_000,
    defaultMessage: "당신의 작품이 많은 사람들에게 봄처럼 다가가길 바랍니다.",
    animationKey: "petals",
    sortOrder: 20,
  },
  {
    slug: "sunflower",
    nameKo: "해바라기",
    nameEn: "Sunflower",
    emoji: "🌻",
    priceKrw: 500_000,
    defaultMessage: "당신은 많은 사람들에게 빛이 되는 창작자입니다.",
    animationKey: "sun-glow",
    sortOrder: 30,
  },
  {
    slug: "camellia",
    nameKo: "동백",
    nameEn: "Camellia",
    emoji: "🌺",
    priceKrw: 700_000,
    defaultMessage: "당신의 열정과 노력을 진심으로 응원합니다.",
    animationKey: "deep-bloom",
    sortOrder: 40,
  },
  {
    slug: "lily",
    nameKo: "백합",
    nameEn: "Lily",
    emoji: "🌼",
    priceKrw: 1_000_000,
    defaultMessage: "최고의 존경과 감사의 마음을 담아 보냅니다.",
    animationKey: "prestige",
    sortOrder: 50,
  },
] as const;
