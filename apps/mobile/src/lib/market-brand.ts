export const MARKET_BRAND_NAME = "More Commerce Moment";
export const MARKET_BRAND_FULL = `MoCoMo ${MARKET_BRAND_NAME}`;

export const MARKET_LISTING_FILTERS = [
  { id: "ALL" as const, label: "전체" },
  { id: "PHYSICAL" as const, label: "일반상품" },
  { id: "CUSTOM_ORDER" as const, label: "주문제작" },
  { id: "PREORDER" as const, label: "예약판매" },
];

export type MarketListingFilterId = (typeof MARKET_LISTING_FILTERS)[number]["id"];
