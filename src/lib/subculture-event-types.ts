import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";

export type SubcultureEventSeed = {
  externalKey: string;
  country?: SubcultureEventCountry;
  title: string;
  description?: string;
  category: "comic" | "anime" | "cosplay" | "goods" | "other";
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
  other: "기타",
};
