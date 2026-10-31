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
  comic: "Comics & doujin",
  anime: "Anime",
  cosplay: "Cosplay",
  goods: "Merch & illustration",
  maid_cafe: "Maid Cafe",
  user_recommendation: "Featured",
  other: "Other",
};

/** 지도 핀 색 (범례·MapLibre 공통) — pink / green / blue circular pins */
export const SUBCULTURE_EVENT_CATEGORY_COLORS: Record<string, string> = {
  comic: "#3b82f6",
  anime: "#3b82f6",
  cosplay: "#3b82f6",
  goods: "#3b82f6",
  maid_cafe: "#ff69b4",
  user_recommendation: "#22c55e",
  other: "#3b82f6",
};

/** 행사 지도 사이드 패널 탭 — keep English; do not machine-translate */
export type EventMapPanelTab = "venue" | "maid_cafe" | "recommendation";

export const EVENT_MAP_PANEL_TABS: { id: EventMapPanelTab; label: string }[] = [
  { id: "venue", label: "Places" },
  { id: "maid_cafe", label: "Maid Cafe" },
  { id: "recommendation", label: "Featured" },
];
