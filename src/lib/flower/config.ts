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
  LIVE: "Live",
  POST: "Post",
  COMMENT: "Comment",
  MESSAGE: "Chat",
  PROFILE: "프로필",
  DIRECT: "Direct gift",
  OTHER: "Other",
};

export const FLOWER_CATALOG_PRESET = [
  {
    slug: "rose",
    nameKo: "Rose",
    nameEn: "Rose",
    emoji: "🌹",
    priceKrw: 50_000,
    defaultMessage: "Always cheering for you.",
    animationKey: "bloom-soft",
    sortOrder: 10,
  },
  {
    slug: "cherry-blossom",
    nameKo: "Cherry blossom",
    nameEn: "Cherry Blossom",
    emoji: "🌸",
    priceKrw: 100_000,
    defaultMessage: "May your work reach many people like spring itself.",
    animationKey: "petals",
    sortOrder: 20,
  },
  {
    slug: "sunflower",
    nameKo: "Sunflower",
    nameEn: "Sunflower",
    emoji: "🌻",
    priceKrw: 500_000,
    defaultMessage: "You are a creator who brings light to many people.",
    animationKey: "sun-glow",
    sortOrder: 30,
  },
  {
    slug: "camellia",
    nameKo: "Camellia",
    nameEn: "Camellia",
    emoji: "🌺",
    priceKrw: 700_000,
    defaultMessage: "We sincerely support your passion and hard work.",
    animationKey: "deep-bloom",
    sortOrder: 40,
  },
  {
    slug: "lily",
    nameKo: "Lily",
    nameEn: "Lily",
    emoji: "🌼",
    priceKrw: 1_000_000,
    defaultMessage: "Sent with the deepest respect and gratitude.",
    animationKey: "prestige",
    sortOrder: 50,
  },
] as const;
