import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";

type MapPinSearchFields = {
  title: string;
  venueName: string | null;
  country: SubcultureEventCountry;
  category: string;
};

const MAID_CAFE_SEARCH_LABEL: Partial<Record<SubcultureEventCountry, string>> = {
  kr: "메이드 카페",
  jp: "メイドカフェ",
  cn: "女仆咖啡厅",
  tw: "女僕咖啡廳",
  hk: "女僕咖啡廳",
  mo: "女僕咖啡廳",
};

function maidCafeSearchLabel(country: SubcultureEventCountry): string {
  return MAID_CAFE_SEARCH_LABEL[country] ?? "maid cafe";
}

function normalizeSearchToken(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/** Google 검색 쿼리 — 메이드 카페는 상호 + 현지어 카테고리 + 국가 코드 */
export function googleSearchQueryForMapPin(pin: MapPinSearchFields): string {
  const venue = pin.venueName?.trim() ?? "";
  const title = pin.title.trim();
  const primaryName = venue || title;

  if (pin.category === "maid_cafe") {
    const parts = [primaryName, maidCafeSearchLabel(pin.country)];
    if (pin.country !== "other") {
      parts.push(pin.country.toUpperCase());
    }
    return parts.filter(Boolean).join(" ");
  }

  const parts: string[] = [];
  if (venue) parts.push(venue);
  if (title && normalizeSearchToken(title) !== normalizeSearchToken(venue)) {
    parts.push(title);
  }
  if (pin.country !== "other") {
    parts.push(pin.country.toUpperCase());
  }
  return parts.join(" ");
}

export function googleSearchUrlForMapPin(pin: MapPinSearchFields): string {
  const q = encodeURIComponent(googleSearchQueryForMapPin(pin));
  return `https://www.google.com/search?q=${q}`;
}
