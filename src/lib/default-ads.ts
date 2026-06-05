/** DB 연결 실패 시에도 표시할 기본 광고 (정적) */
export const FALLBACK_FEED_ADS = [
  {
    id: "fallback-premium",
    title: "MoCoMo Premium — 광고 없이 애니덕질",
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
    linkUrl: "/events/map",
    ctaLabel: "참가하기",
  },
] as const;

/** 데스크톱 좌·우 여백 레일 (피드 본문과 분리) */
export const FALLBACK_RAIL_LEFT_ADS = [
  {
    id: "fallback-rail-premium",
    title: "MoCoMo Premium",
    imageUrl: "/ads/premium.svg",
    linkUrl: "/premium",
    sponsorName: "MoCoMo",
    ctaLabel: "광고 없이 이용",
  },
] as const;

export const FALLBACK_RAIL_RIGHT_ADS = [
  {
    id: "fallback-rail-market",
    title: "후원 이모티콘",
    imageUrl: "/ads/events.svg",
    linkUrl: "/support?tab=emoticons",
    sponsorName: "MoCoMo",
    ctaLabel: "둘러보기",
  },
  {
    id: "fallback-rail-live",
    title: "라이브 방송",
    imageUrl: "/ads/live.svg",
    linkUrl: "/live",
    sponsorName: "MoCoMo Live",
    ctaLabel: "시청하기",
  },
] as const;

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
