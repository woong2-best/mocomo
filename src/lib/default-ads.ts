/** DB 연결 실패 시에도 표시할 기본 광고 (정적) */
export const FALLBACK_FEED_ADS = [
  {
    id: "fallback-premium",
    title: "MoCoMo Premium — 광고 없이 덕질",
    imageUrl: "/ads/premium.svg",
    linkUrl: "/premium",
    sponsorName: "MoCoMo",
    ctaLabel: "프리미엄 보기",
    adCategory: "프리미엄",
  },
  {
    id: "fallback-live",
    title: "라이브 방송 시작하기",
    imageUrl: "/ads/live.svg",
    linkUrl: "/live",
    sponsorName: "MoCoMo Live",
    ctaLabel: "라이브 보기",
    adCategory: "라이브",
  },
] as const;

export const FALLBACK_SIDEBAR_ADS = [
  {
    id: "fallback-events",
    title: "진행 중인 이벤트",
    imageUrl: "/ads/events.svg",
    linkUrl: "/events",
    ctaLabel: "참가하기",
  },
] as const;

export type FeedAdData = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
  adCategory?: string | null;
};
