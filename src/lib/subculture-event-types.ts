import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";

export type SubcultureEventSeed = {
  externalKey: string;
  country?: SubcultureEventCountry;
  title: string;
  description?: string;
  category: "comic" | "anime" | "cosplay" | "goods" | "maid_cafe" | "user_recommendation" | "other";
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string;
  sourceUrl: string;
  officialNoticeUrl?: string;
  imageUrl?: string;
  roadViewImageUrl?: string;
};

export const SUBCULTURE_EVENT_CATEGORY_LABELS: Record<string, string> = {
  comic: "코믹·동인",
  anime: "애니",
  cosplay: "코스프레",
  goods: "굿즈·일러스트",
  maid_cafe: "메이드 카페",
  user_recommendation: "추천",
  other: "기타",
};

/** 지도 핀 색 (범례·MapLibre 공통) */
export const SUBCULTURE_EVENT_CATEGORY_COLORS: Record<string, string> = {
  comic: "#8b5cf6",
  anime: "#3b82f6",
  cosplay: "#d946ef",
  goods: "#f59e0b",
  maid_cafe: "#ec4899",
  user_recommendation: "#22c55e",
  other: "#64748b",
};

/** 행사 지도 사이드 패널 탭 */
export type EventMapPanelTab = "venue" | "maid_cafe" | "recommendation";

export const EVENT_MAP_PANEL_TABS: { id: EventMapPanelTab; label: string }[] = [
  { id: "venue", label: "행사장" },
  { id: "maid_cafe", label: "메이드 카페" },
  { id: "recommendation", label: "추천" },
];
