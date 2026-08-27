/**
 * Star Market (마켓) 랭킹 파이프라인 — X candidate-pipeline 패턴
 */

export const STAR_MARKET_PARAMS = {
  EnableRecentSource: true,
  EnableTrendingSource: true,
  EnableTrustedSource: true,
  EnableAffinitySource: true,

  RecentSourceLimit: 50,
  TrendingSourceLimit: 40,
  TrustedSourceLimit: 30,
  AffinitySourceLimit: 30,
  FinalSelectLimit: 80,

  MaxListingAgeDays: 90,
  FilterOutOfStock: true,

  ViewWeight: 0.12,
  FavoriteWeight: 0.9,
  SalesWeight: 1.4,
  TrustWeight: 2.0,
  RecencyWeight: 1.8,
  AffinityWeight: 2.5,
  RatingWeight: 0.8,

  SellerDiversityDecay: 0.68,
  EnableSellerDiversity: true,

  CacheTtlHours: 6,
} as const;

export type StarMarketParamKey = keyof typeof STAR_MARKET_PARAMS;
export type StarMarketParams = Record<StarMarketParamKey, number | boolean>;

export function buildStarMarketParams(
  overrides?: Partial<StarMarketParams>
): StarMarketParams {
  return { ...STAR_MARKET_PARAMS, ...overrides };
}

export function starParam(
  params: StarMarketParams,
  key: StarMarketParamKey
): number | boolean {
  return params[key] ?? STAR_MARKET_PARAMS[key];
}

export function starNum(params: StarMarketParams, key: StarMarketParamKey): number {
  const v = starParam(params, key);
  return typeof v === "number" ? v : 0;
}

export function starBool(params: StarMarketParams, key: StarMarketParamKey): boolean {
  const v = starParam(params, key);
  return typeof v === "boolean" ? v : false;
}
