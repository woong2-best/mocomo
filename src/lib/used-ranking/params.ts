/**
 * 중고 (Used Market) 랭킹 파이프라인 파라미터
 */

export const USED_MARKET_PARAMS = {
  EnableRecentSource: true,
  EnableTrendingSource: true,
  EnableAuctionSource: true,
  EnableLocalSource: true,

  RecentSourceLimit: 50,
  TrendingSourceLimit: 40,
  AuctionSourceLimit: 25,
  LocalSourceLimit: 35,
  FinalSelectLimit: 80,

  MaxListingAgeDays: 60,
  FilterSoldListings: true,

  ViewWeight: 0.15,
  FavoriteWeight: 1.0,
  RecencyWeight: 2.0,
  AuctionUrgencyWeight: 2.5,
  GeoMatchWeight: 2.2,
  CategoryAffinityWeight: 1.6,
  WorkAffinityWeight: 1.4,

  SellerDiversityDecay: 0.7,
  EnableSellerDiversity: true,

  CacheTtlHours: 4,
} as const;

export type UsedMarketParamKey = keyof typeof USED_MARKET_PARAMS;
export type UsedMarketParams = Record<UsedMarketParamKey, number | boolean>;

export function buildUsedMarketParams(
  overrides?: Partial<UsedMarketParams>
): UsedMarketParams {
  return { ...USED_MARKET_PARAMS, ...overrides };
}

export function usedParam(
  params: UsedMarketParams,
  key: UsedMarketParamKey
): number | boolean {
  return params[key] ?? USED_MARKET_PARAMS[key];
}

export function usedNum(params: UsedMarketParams, key: UsedMarketParamKey): number {
  const v = usedParam(params, key);
  return typeof v === "number" ? v : 0;
}

export function usedBool(params: UsedMarketParams, key: UsedMarketParamKey): boolean {
  const v = usedParam(params, key);
  return typeof v === "boolean" ? v : false;
}
