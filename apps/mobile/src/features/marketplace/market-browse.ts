/** Hub menu (slide panel) and the horizontal shelf on the used market list. */

export type HubCategory = {
  id: string;
  labelKey: string;
  /** Passed as the listings `category` query. */
  category?: string;
  /** Passed as the listings `product` query. */
  product?: string;
};

export type MarketShelfItem = {
  id: string;
  labelKey?: string;
  category?: string;
  product?: string;
  sale?: "fixed" | "auction";
};

/** Broad categories that used to sit on the list chips. One row each in the hub. */
export const HUB_CATEGORIES: HubCategory[] = [
  { id: "ALL", labelKey: "m.common.all" },
  { id: "FIGURE", labelKey: "m.used.catalog.FIGURE", category: "FIGURE" },
  { id: "TCG", labelKey: "m.marketplace.tcg", category: "TCG" },
  { id: "CARDS", labelKey: "m.market.hub.cards", category: "CARDS" },
  { id: "GOODS", labelKey: "m.used.catalog.GOODS", category: "GOODS" },
  { id: "BOOKS", labelKey: "m.marketplace.books", category: "BOOK" },
  { id: "MEDIA", labelKey: "m.market.hub.media", product: "MEDIA" },
  { id: "COSPLAY", labelKey: "m.events.cosplay", category: "COSPLAY" },
  { id: "DIGITAL", labelKey: "m.marketplace.digital", category: "DIGITAL" },
  { id: "ELECTRONICS", labelKey: "m.market.hub.electronics", product: "ELECTRONICS" },
];

/**
 * Top shelf. Used and Auction come first, then the long product rail
 * the buyer swipes through.
 */
export const MARKET_SHELF: MarketShelfItem[] = [
  { id: "USED", labelKey: "m.marketplace.used", sale: "fixed" },
  { id: "AUCTION", labelKey: "m.marketplace.auction", sale: "auction" },
  { id: "PLAMODEL", product: "PLAMODEL" },
  { id: "PLUSH", product: "PLUSH" },
  { id: "STATUE", product: "STATUE" },
  { id: "ACRYLIC_STAND", product: "ACRYLIC_STAND" },
  { id: "CAN_BADGE", product: "CAN_BADGE" },
  { id: "KEYRING", product: "KEYRING" },
  { id: "COSPLAY_COSTUME", product: "COSPLAY_COSTUME" },
  { id: "WIG", product: "WIG" },
  { id: "FASHION", labelKey: "m.used.catalog.FASHION", category: "FASHION" },
  { id: "TCG_CARD", product: "TCG_CARD" },
  { id: "TCG_POKEMON", product: "TCG_POKEMON" },
  { id: "TCG_YGO", product: "TCG_YGO" },
  { id: "TCG_MTG", product: "TCG_MTG" },
  { id: "TCG_ONEPIECE", product: "TCG_ONEPIECE" },
  { id: "TCG_OTHER", product: "TCG_OTHER" },
  { id: "PHOTOCARD", product: "PHOTOCARD" },
  { id: "DOUJIN", product: "DOUJIN" },
  { id: "ARTBOOK", product: "ARTBOOK" },
  { id: "BOARDGAME", product: "BOARDGAME" },
  { id: "VTUBER_GOODS", product: "VTUBER_GOODS" },
  { id: "EVENT_GOODS", product: "EVENT_GOODS" },
  { id: "BOOK", product: "BOOK" },
  { id: "MEDIA", product: "MEDIA" },
  { id: "ELECTRONICS", product: "ELECTRONICS" },
  { id: "CUSTOM_COMMISSION", product: "CUSTOM_COMMISSION" },
  { id: "STREAMER_ASSET", product: "STREAMER_ASSET" },
  { id: "OTHER", product: "OTHER" },
];
