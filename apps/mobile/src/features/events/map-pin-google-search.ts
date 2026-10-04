type MapPinSearchFields = {
  title: string;
  venueName?: string | null;
  venue?: string | null;
  country: string;
  category: string;
};

const MAID_CAFE_SEARCH_LABEL: Record<string, string> = {
  kr: "메이드 카페",
  jp: "メイドカフェ",
  cn: "女仆咖啡厅",
  tw: "女僕咖啡廳",
  hk: "女僕咖啡廳",
  mo: "女僕咖啡廳",
};

function maidCafeSearchLabel(country: string): string {
  const code = country.trim().toLowerCase();
  return MAID_CAFE_SEARCH_LABEL[code] ?? "maid cafe";
}

function normalizeSearchToken(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function googleSearchQueryForMapPin(pin: MapPinSearchFields): string {
  const venue = (pin.venueName ?? pin.venue ?? "").trim();
  const title = pin.title.trim();
  const primaryName = venue || title;
  const country = pin.country.trim().toLowerCase();

  if (pin.category === "maid_cafe") {
    const parts = [primaryName, maidCafeSearchLabel(country)];
    if (country && country !== "other") {
      parts.push(country.toUpperCase());
    }
    return parts.filter(Boolean).join(" ");
  }

  const parts: string[] = [];
  if (venue) parts.push(venue);
  if (title && normalizeSearchToken(title) !== normalizeSearchToken(venue)) {
    parts.push(title);
  }
  if (country && country !== "other") {
    parts.push(country.toUpperCase());
  }
  return parts.join(" ");
}

export function googleSearchUrlForMapPin(pin: MapPinSearchFields): string {
  return `https://www.google.com/search?q=${encodeURIComponent(googleSearchQueryForMapPin(pin))}`;
}
