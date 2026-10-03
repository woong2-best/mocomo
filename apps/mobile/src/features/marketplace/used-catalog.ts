/** Used-market catalog constants for mobile (mirrors web). */

import { formatPrice } from "@/lib/money";
import { englishText } from "@/i18n/messages";
import type { TFn } from "@/i18n/types";
import { translate } from "@/i18n/runtime";
import {
  USED_CATEGORIES,
  USED_SELL_KINDS,
  USED_PRODUCT_TYPES,
  USED_CONDITION_GRADES,
  USED_LIMITED_KINDS,
  USED_TRADE_MODES,
} from "@/data/server-values/used-catalog-ko";
import {
  KOREA_SIDO,
  KOREA_SIGUNGU_BY_SIDO,
  USED_SHIPPING_REGION,
  LEGACY_USED_SHIPPING_REGION,
  inferUsedRegionFromGeocodeLabel,
  regionToEnglish,
  sidoEnglishName,
  sigunguEnglishName,
  isShippingRegionValue,
  DEFAULT_SIGUNGU,
  DEFAULT_SIDO_SHORT,
} from "@/data/server-values/korea-regions";

export type UsedUiText = TFn;

/** English labels for catalog ids (KO labels stay on const arrays for storage parity). */
const CATALOG_LABEL_EN: Record<string, string> = {
  FIGURE: "Figures",
  TCG: "TCG",
  GOODS: "Goods",
  BOOK: "Books",
  COSPLAY: "Cosplay",
  DIGITAL: "Digital",
  PLAMODEL: "Plastic models",
  PLUSH: "Plush",
  STATUE: "Statues",
  ACRYLIC_STAND: "Acrylic stands",
  CAN_BADGE: "Pin badges",
  KEYRING: "Keychains",
  COSPLAY_COSTUME: "Cosplay costumes",
  WIG: "Wigs",
  TCG_CARD: "Trading cards",
  TCG_POKEMON: "Pokémon cards",
  TCG_YGO: "Yu-Gi-Oh!",
  TCG_MTG: "Magic: The Gathering",
  TCG_ONEPIECE: "One Piece cards",
  TCG_OTHER: "Other TCG",
  PHOTOCARD: "Photocards",
  DOUJIN: "Doujin",
  ARTBOOK: "Art books",
  BOARDGAME: "Board games",
  VTUBER_GOODS: "VTuber goods",
  EVENT_GOODS: "Event exclusives",
  MEDIA: "CD / DVD / Blu-ray",
  OTHER: "Other",
  COSPLAY_FASHION: "Cosplay / fashion",
  NEW: "Sealed / like new",
  LIKE_NEW: "Like new",
  POOR: "Damaged / defects",
  UNKNOWN: "Condition not listed",
  EVENT_EXCLUSIVE: "Event exclusive",
  VENUE_ONLY: "Venue exclusive",
  PREORDER: "Pre-order",
  COLLAB: "Collab / limited",
  LIMITED_RUN: "Limited run",
  LOTTERY: "Lottery / kuji",
  PROMO: "Promo bonus",
  TRADE: "Trade only (WTT)",
  SELL_OR_TRADE: "Sell or trade",
};

export function usedCatalogLabel(id: string, t: UsedUiText = translate): string {
  const key = `m.used.catalog.${id}`;
  if (englishText(key) !== key) return t(key);
  return CATALOG_LABEL_EN[id] ?? id;
}

export {
  USED_CATEGORIES,
  USED_SELL_KINDS,
  USED_PRODUCT_TYPES,
  USED_CONDITION_GRADES,
  USED_LIMITED_KINDS,
  USED_TRADE_MODES,
  KOREA_SIDO,
  KOREA_SIGUNGU_BY_SIDO,
  USED_SHIPPING_REGION,
  LEGACY_USED_SHIPPING_REGION,
  inferUsedRegionFromGeocodeLabel,
  regionToEnglish,
  sidoEnglishName,
  sigunguEnglishName,
  isShippingRegionValue,
  DEFAULT_SIGUNGU,
  DEFAULT_SIDO_SHORT,
};

export function displayUsedRegion(region: string, t?: UsedUiText): string {
  const trimmed = region.trim();
  if (isShippingRegionValue(trimmed) || trimmed === "Shipping") {
    return (t ?? translate)("m.used.nationwide_shipping");
  }
  return regionToEnglish(trimmed);
}

export function isUsedShippingRegionLabel(region: string): boolean {
  return isShippingRegionValue(region.trim()) || region.trim() === "Shipping";
}

export function formatUsedRegion(sidoShort: string, sigungu: string) {
  if (
    sigungu === USED_SHIPPING_REGION ||
    sigungu === LEGACY_USED_SHIPPING_REGION
  ) {
    return USED_SHIPPING_REGION;
  }
  return `${sidoShort} ${sigungu}`;
}

export function formatUsedPrice(price: number, currency?: string | null, t?: UsedUiText) {
  if (price === 0) return (t ?? translate)("m.common.free");
  return formatPrice(price, currency ?? "krw");
}

export function formatUsedTimeAgo(date: string, t?: UsedUiText) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t ? t("m.common.just_now") : translate("m.common.just_now");
  if (mins < 60) {
    return t ? t("m.marketplace.mins_m_ago", { mins: String(mins) }) : translate("m.marketplace.mins_m_ago", { mins: String(mins) });
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return t ? t("m.marketplace.hours_h_ago", { hours: String(hours) }) : translate("m.marketplace.hours_h_ago", { hours: String(hours) });
  }
  const days = Math.floor(hours / 24);
  if (days < 7) return t ? t("m.marketplace.days_d_ago", { days: String(days) }) : translate("m.marketplace.days_d_ago", { days: String(days) });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t ? t("m.marketplace.weeks_w_ago", { weeks: String(weeks) }) : translate("m.marketplace.weeks_w_ago", { weeks: String(weeks) });
  const months = Math.floor(days / 30);
  if (months < 12) {
    return t ? t("m.marketplace.months_mo_ago", { months: String(months) }) : translate("m.marketplace.months_mo_ago", { months: String(months) });
  }
  const years = Math.floor(days / 365);
  return t ? t("m.marketplace.years_y_ago", { years: String(years) }) : translate("m.marketplace.years_y_ago", { years: String(years) });
}

export function usedStatusLabel(status: string, t?: UsedUiText) {
  switch (status) {
    case "SELLING":
      return (t ?? translate)("m.marketplace.for_sale");
    case "RESERVED":
      return (t ?? translate)("m.common.reserved");
    case "SOLD":
      return (t ?? translate)("m.common.sold");
    default:
      return status;
  }
}

export function productTypeLabel(id: string | null | undefined, t?: UsedUiText): string {
  if (!id) return "";
  const fromSell = USED_SELL_KINDS.find((p) => p.id === id);
  if (fromSell) return usedCatalogLabel(fromSell.id, t);
  const fromProduct = USED_PRODUCT_TYPES.find((p) => p.id === id);
  if (fromProduct) return usedCatalogLabel(fromProduct.id, t);
  return id;
}

export function usedCurrencyLabel(currencyId: string, t?: UsedUiText): string {
  const id = currencyId.toLowerCase();
  if (!USED_CURRENCY_META[id]) return currencyId;
  return (t ?? translate)(`m.used.currency.${id}`);
}

export const USED_CURRENCY_META: Record<string, { id: string; symbol: string }> = {
  krw: { id: "krw", symbol: "₩" },
  usd: { id: "usd", symbol: "$" },
  jpy: { id: "jpy", symbol: "¥" },
  eur: { id: "eur", symbol: "€" },
  gbp: { id: "gbp", symbol: "£" },
  twd: { id: "twd", symbol: "NT$" },
  cny: { id: "cny", symbol: "¥" },
  hkd: { id: "hkd", symbol: "HK$" },
  sgd: { id: "sgd", symbol: "S$" },
  aud: { id: "aud", symbol: "A$" },
  cad: { id: "cad", symbol: "C$" },
  thb: { id: "thb", symbol: "฿" },
};

const EUROZONE = new Set([
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
]);

const COUNTRY_HOME_CURRENCY: Record<string, string> = {
  KR: "krw",
  JP: "jpy",
  US: "usd",
  GB: "gbp",
  TW: "twd",
  CN: "cny",
  HK: "hkd",
  SG: "sgd",
  AU: "aud",
  CA: "cad",
  TH: "thb",
};

export function homeCurrencyForCountry(countryCode?: string | null): string {
  const cc = (countryCode ?? "KR").toUpperCase();
  if (COUNTRY_HOME_CURRENCY[cc]) return COUNTRY_HOME_CURRENCY[cc];
  if (EUROZONE.has(cc)) return "eur";
  return "usd";
}

export function listingCurrencyChoices(countryCode?: string | null) {
  const homeId = homeCurrencyForCountry(countryCode);
  const home = USED_CURRENCY_META[homeId] ?? USED_CURRENCY_META.usd;
  const usd = USED_CURRENCY_META.usd;
  if (home.id === "usd") return [usd];
  return [home, usd];
}

export function parseListingPriceInput(raw: string, currency: string): number {
  const cleaned = raw.trim().replace(/,/g, "");
  if (!cleaned) return 0;
  if (currency === "usd") {
    const dollars = Number(cleaned);
    if (!Number.isFinite(dollars) || dollars < 0) return 0;
    return Math.round(dollars * 100);
  }
  return Math.floor(Number(cleaned) || 0);
}

/** Format a stored amount for the price input. USD listings stay in dollars. */
export function usedPriceInputValue(amount: number, currency?: string | null): string {
  if (!Number.isFinite(amount)) return "";
  if ((currency ?? "krw").toLowerCase() === "usd") {
    const dollars = amount / 100;
    return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
  }
  return String(Math.max(0, Math.round(amount)));
}

export function productTypeForSellKind(kind: string): string | undefined {
  const id = kind.toUpperCase();
  if (id === "FIGURE") return "FIGURE";
  if (id === "TCG") return "TCG_CARD";
  if (id === "BOOK") return "BOOK";
  if (id === "COSPLAY") return "COSPLAY_COSTUME";
  if (id === "GOODS" || id === "DIGITAL") return "OTHER";
  return undefined;
}

export type UsedListingMediaKind = "image" | "video";

export function usedListingMediaKind(url: string): UsedListingMediaKind {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (/\.(mp4|mov|webm|m4v|mkv)$/.test(path)) return "video";
  if (path.includes("/video/") || path.includes("video%2F")) return "video";
  return "image";
}

export function usedListingMediaItems(urls: string[]) {
  return urls.map((url, index) => ({
    id: `used-media-${index}`,
    url,
    kind: usedListingMediaKind(url),
  }));
}
