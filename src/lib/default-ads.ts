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

/** 오른쪽 패널 Sponsored — DB 없을 때 표시 */
export const FALLBACK_SIDEBAR_ADS = [
  {
    id: "fallback-events",
    title: "진행 중인 이벤트",
    imageUrl: "/ads/events.svg",
    linkUrl: "/events",
    ctaLabel: "참가하기",
  },
] as const;
