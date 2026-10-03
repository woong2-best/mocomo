export const MARKET_BRAND_NAME = "More Commerce Moment";
export const MARKET_BRAND_FULL = `MoCoMo ${MARKET_BRAND_NAME}`;

export const MARKET_LISTING_FILTERS = [
  { id: "ALL" as const, label: "All" },
  { id: "PHYSICAL" as const, label: "Physical goods" },
  { id: "CUSTOM_ORDER" as const, label: "Custom order" },
  { id: "PREORDER" as const, label: "Pre-order" },
];

export type MarketListingFilterId = (typeof MARKET_LISTING_FILTERS)[number]["id"];
