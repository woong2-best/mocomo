export type RailAdData = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
};

export type FeedAdData = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
  adCategory?: string | null;
};

/** 오른쪽 패널 Sponsored — 폴백 데모 광고 없음 (유료 스폰서만 본문 표시) */
export const FALLBACK_SIDEBAR_ADS = [] as const;
