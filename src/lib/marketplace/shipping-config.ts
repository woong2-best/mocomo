/**
 * Marketplace shipping config — add countries/carriers here without schema migration.
 * Tracking providers live under ./tracking (AfterShip/Shippo/etc. later).
 */

export const MARKETPLACE_SHIP_COUNTRY_CODES = ["KR", "US", "JP", "CN"] as const;

export type MarketplaceShipCountryCode = (typeof MARKETPLACE_SHIP_COUNTRY_CODES)[number];

export type MarketplaceCarrier = {
  id: string;
  label: string;
  /** ISO country where this carrier is typically used; null = international */
  country: MarketplaceShipCountryCode | null;
  /** Future AfterShip/Shippo slug mapping */
  trackingSlug?: string;
};

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

/** Domestic carriers by destination/origin country */
export const MARKETPLACE_DOMESTIC_CARRIERS: Record<MarketplaceShipCountryCode, MarketplaceCarrier[]> = {
  KR: [
    { id: "KR_POST", label: "우체국", country: "KR", trackingSlug: "korea-post" },
    { id: "KR_CJ", label: "CJ대한통운", country: "KR", trackingSlug: "cj-korea-thai" },
    { id: "KR_HANJIN", label: "한진택배", country: "KR", trackingSlug: "hanjin" },
    { id: "KR_LOTTE", label: "롯데택배", country: "KR", trackingSlug: "lotte" },
  ],
  US: [
    { id: "US_USPS", label: "USPS", country: "US", trackingSlug: "usps" },
    { id: "US_UPS", label: "UPS", country: "US", trackingSlug: "ups" },
    { id: "US_FEDEX", label: "FedEx", country: "US", trackingSlug: "fedex" },
  ],
  JP: [
    { id: "JP_POST", label: "Japan Post", country: "JP", trackingSlug: "japan-post" },
    { id: "JP_YAMATO", label: "Yamato Transport", country: "JP", trackingSlug: "yamato" },
    { id: "JP_SAGAWA", label: "Sagawa Express", country: "JP", trackingSlug: "sagawa" },
  ],
  CN: [
    { id: "CN_SF", label: "SF Express", country: "CN", trackingSlug: "sf-express" },
    { id: "CN_POST", label: "China Post", country: "CN", trackingSlug: "china-post" },
    { id: "CN_JD", label: "JD Logistics", country: "CN", trackingSlug: "jd" },
  ],
};

/** Cross-border couriers (seller ships abroad; MoCoMo only stores tracking) */
export const MARKETPLACE_INTERNATIONAL_CARRIERS: MarketplaceCarrier[] = [
  { id: "INTL_EMS", label: "EMS", country: null, trackingSlug: "korea-post" },
  { id: "INTL_DHL", label: "DHL", country: null, trackingSlug: "dhl" },
  { id: "INTL_FEDEX", label: "FedEx International", country: null, trackingSlug: "fedex" },
  { id: "INTL_UPS", label: "UPS Worldwide", country: null, trackingSlug: "ups" },
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

export function listAllMarketplaceCarriers(): MarketplaceCarrier[] {
  return [
    ...MARKETPLACE_INTERNATIONAL_CARRIERS,
    ...MARKETPLACE_SHIP_COUNTRY_CODES.flatMap((c) => MARKETPLACE_DOMESTIC_CARRIERS[c]),
  ];
}

export function getCarrierById(id: string): MarketplaceCarrier | undefined {
  return listAllMarketplaceCarriers().find((c) => c.id === id);
}

/**
 * Carriers offered when seller ships an order.
 * Domestic (same country) → local carriers; otherwise international + destination local.
 */
export function getCarriersForShipment(opts: {
  originCountry?: string | null;
  destCountry?: string | null;
}): MarketplaceCarrier[] {
  const origin = normalizeShipCountry(opts.originCountry);
  const dest = normalizeShipCountry(opts.destCountry);
  const map = new Map<string, MarketplaceCarrier>();

  const add = (list: MarketplaceCarrier[]) => {
    for (const c of list) map.set(c.id, c);
  };

  if (origin && dest && origin === dest) {
    add(MARKETPLACE_DOMESTIC_CARRIERS[dest]);
  } else {
    add(MARKETPLACE_INTERNATIONAL_CARRIERS);
    if (dest) add(MARKETPLACE_DOMESTIC_CARRIERS[dest]);
    if (origin) add(MARKETPLACE_DOMESTIC_CARRIERS[origin]);
  }

  return [...map.values()];
}

export function validateShipToCountries(
  codes: string[] | null | undefined
): { ok: true; countries: MarketplaceShipCountryCode[] } | { ok: false; error: string } {
  if (!codes || codes.length === 0) {
    return { ok: false, error: "배송 가능 국가를 1개 이상 선택해 주세요." };
  }
  const normalized: MarketplaceShipCountryCode[] = [];
  for (const raw of codes) {
    const code = normalizeShipCountry(raw);
    if (!code) {
      return {
        ok: false,
        error: `지원하지 않는 국가입니다: ${raw}. 현재 KR / US / JP / CN 만 가능합니다.`,
      };
    }
    if (!normalized.includes(code)) normalized.push(code);
  }
  return { ok: true, countries: normalized };
}

export function listingShipsToCountry(
  shipToCountries: string[] | null | undefined,
  shipsWorldwide: boolean | null | undefined,
  buyerCountry: string
): boolean {
  const dest = normalizeShipCountry(buyerCountry);
  if (!dest) return false;
  const list = (shipToCountries ?? []).map((c) => c.toUpperCase());
  // Empty list + shipsWorldwide (legacy) → all currently supported countries
  if (list.length === 0 && shipsWorldwide) return true;
  return list.includes(dest);
}

export const UNSUPPORTED_SHIP_COUNTRY_MESSAGE =
  "이 상품은 현재 선택하신 국가로 배송할 수 없습니다.";

export const UNSUPPORTED_ADDRESS_COUNTRY_MESSAGE =
  "현재 배송 주소는 대한민국·미국·일본·중국만 등록할 수 있습니다.";
