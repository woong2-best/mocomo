/** Parity with web `src/lib/marketplace/shipping-config.ts` (ship countries only). */

import { translate } from "@/i18n/runtime";

export const MARKETPLACE_SHIP_COUNTRY_CODES = ["KR", "US", "JP", "CN"] as const;

export type MarketplaceShipCountryCode = (typeof MARKETPLACE_SHIP_COUNTRY_CODES)[number];

export const MARKETPLACE_SHIP_COUNTRIES: {
  code: MarketplaceShipCountryCode;
  labelKey: string;
}[] = [
  { code: "KR", labelKey: "m.lib.south_korea" },
  { code: "US", labelKey: "m.lib.united_states" },
  { code: "JP", labelKey: "m.lib.japan" },
  { code: "CN", labelKey: "m.lib.china" },
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

export function shipCountryLabel(code: string, _locale?: string): string {
  const row = MARKETPLACE_SHIP_COUNTRIES.find((c) => c.code === code.toUpperCase());
  if (!row) return code;
  return translate(row.labelKey);
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

export function unsupportedShipCountryMessage(): string {
  return translate("m.market.unsupported_ship_country");
}
