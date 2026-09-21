/** Parity with web `src/lib/marketplace/shipping-config.ts` (ship countries only). */

export const MARKETPLACE_SHIP_COUNTRY_CODES = ["KR", "US", "JP", "CN"] as const;

export type MarketplaceShipCountryCode = (typeof MARKETPLACE_SHIP_COUNTRY_CODES)[number];

export const MARKETPLACE_SHIP_COUNTRIES: {
  code: MarketplaceShipCountryCode;
  labelKo: string;
  labelEn: string;
}[] = [
  { code: "KR", labelKo: "대한민국", labelEn: "South Korea" },
  { code: "US", labelKo: "미국", labelEn: "United States" },
  { code: "JP", labelKo: "일본", labelEn: "Japan" },
  { code: "CN", labelKo: "중국", labelEn: "China" },
];

export function isMarketplaceShipCountry(code: string | null | undefined): code is MarketplaceShipCountryCode {
  if (!code) return false;
  return (MARKETPLACE_SHIP_COUNTRY_CODES as readonly string[]).includes(code.toUpperCase());
}

export function normalizeShipCountry(code: string | null | undefined): MarketplaceShipCountryCode | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return isMarketplaceShipCountry(upper) ? upper : null;
}

export function shipCountryLabel(code: string, locale: "ko" | "en" = "ko"): string {
  const row = MARKETPLACE_SHIP_COUNTRIES.find((c) => c.code === code.toUpperCase());
  if (!row) return code;
  return locale === "en" ? row.labelEn : row.labelKo;
}

export function listingShipsToCountry(
  shipToCountries: string[] | null | undefined,
  shipsWorldwide: boolean | null | undefined,
  buyerCountry: string
): boolean {
  const dest = normalizeShipCountry(buyerCountry);
  if (!dest) return false;
  const list = (shipToCountries ?? []).map((c) => c.toUpperCase());
  if (list.length === 0 && shipsWorldwide) return true;
  return list.includes(dest);
}

export const UNSUPPORTED_SHIP_COUNTRY_MESSAGE =
  "이 상품은 현재 선택하신 국가로 배송할 수 없습니다.";
