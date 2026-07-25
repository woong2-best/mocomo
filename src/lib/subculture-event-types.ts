import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";

export type SubcultureEventSeed = {
  externalKey: string;
  country?: SubcultureEventCountry;
  title: string;
  description?: string;
  category: "comic" | "anime" | "cosplay" | "goods" | "maid_cafe" | "other";
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string;
  sourceUrl: string;
  officialNoticeUrl?: string;
};

export const SUBCULTURE_EVENT_CATEGORY_LABELS: Record<string, string> = {
  comic: "코믹·동인",
  anime: "애니",
  cosplay: "코스프레",
  goods: "굿즈·일러스트",
  maid_cafe: "메이드 카페",
  other: "기타",
};

/** 지도 핀 색 (범례·Leaflet 공통) */
export const SUBCULTURE_EVENT_CATEGORY_COLORS: Record<string, string> = {
  comic: "#8b5cf6",
  anime: "#3b82f6",
  cosplay: "#d946ef",
  goods: "#f59e0b",
  maid_cafe: "#ec4899",
  other: "#64748b",
};
