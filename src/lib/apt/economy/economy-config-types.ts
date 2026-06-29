/** 경제 설정 — 타입·기본값·검증 */

export type EconomyConfigValues = {
  goldPerGem: number;
  bonusRate: number;
  dailyGemExchangeLimit: number;
  dailyGoldLimit: number;
  marketFee: number;
  npcBuyRate: number;
  npcSellRate: number;
  starterGold: number;
  liveGoldPerCheer: number;
  dailyLiveGoldLimit: number;
  liveWatchGoldPerMin: number;
  dailyWatchGoldLimit: number;
  dailyMissionReward: number;
  weeklyMissionReward: number;
  featuredRefreshHour: number;
  newItemDays: number;
  discountDefaultRate: number;
  recommendPriceWindow: number;
  maxListingDays: number;
  priceHistoryDays: number;
  defaultFleaFee: number;
  defaultFleaDiscount: number;
  fleaEventCooldownHrs: number;
  pendingExpireDays: number;
  maxOfflineOps: number;
  emergencyMode: boolean;
  fraudRestrictScore: number;
  fraudMarketBlockScore: number;
  fraudLiveBlockScore: number;
};

export type EconomyConfigMeta = {
  version: number;
  publishedAt: string | null;
  publishedByName: string | null;
};

export type EconomyConfigFull = EconomyConfigValues & EconomyConfigMeta;

/** 클라이언트/API 공개용 */
export type PublicEconomyConfig = EconomyConfigValues & {
  version: number;
  publishedAt: string | null;
};

export const ECONOMY_CONFIG_DEFAULTS: EconomyConfigValues = {
  goldPerGem: 100,
  bonusRate: 0,
  dailyGemExchangeLimit: 10000,
  dailyGoldLimit: 50000,
  marketFee: 0.05,
  npcBuyRate: 0.65,
  npcSellRate: 0.7,
  starterGold: 500,
  liveGoldPerCheer: 2,
  dailyLiveGoldLimit: 5000,
  liveWatchGoldPerMin: 15,
  dailyWatchGoldLimit: 3000,
  dailyMissionReward: 80,
  weeklyMissionReward: 400,
  featuredRefreshHour: 0,
  newItemDays: 7,
  discountDefaultRate: 0.2,
  recommendPriceWindow: 20,
  maxListingDays: 30,
  priceHistoryDays: 90,
  defaultFleaFee: 0.05,
  defaultFleaDiscount: 0.3,
  fleaEventCooldownHrs: 168,
  pendingExpireDays: 30,
  maxOfflineOps: 100,
  emergencyMode: false,
  fraudRestrictScore: 70,
  fraudMarketBlockScore: 90,
  fraudLiveBlockScore: 95,
};

export const CONFIG_FIELD_LABELS: Record<keyof EconomyConfigValues, string> = {
  goldPerGem: "Gold per Gem",
  bonusRate: "젬 환전 보너스율",
  dailyGemExchangeLimit: "일일 젬 환전 한도",
  dailyGoldLimit: "일일 골드 생성 한도",
  marketFee: "장터 수수료",
  npcBuyRate: "NPC 매입률",
  npcSellRate: "NPC 판매 할인 기본",
  starterGold: "시작 골드",
  liveGoldPerCheer: "응원당 골드",
  dailyLiveGoldLimit: "일일 라이브 골드 한도",
  liveWatchGoldPerMin: "시청 분당 골드",
  dailyWatchGoldLimit: "일일 시청 골드 한도",
  dailyMissionReward: "일일 미션 보상",
  weeklyMissionReward: "주간 미션 보상",
  featuredRefreshHour: "추천상품 갱신 시각",
  newItemDays: "신상품 표시 일수",
  discountDefaultRate: "기본 할인율",
  recommendPriceWindow: "추천가격 샘플 수",
  maxListingDays: "Listing 최대 기간(일)",
  priceHistoryDays: "가격 히스토리 보관(일)",
  defaultFleaFee: "벼룩시장 기본 수수료",
  defaultFleaDiscount: "벼룩시장 기본 할인",
  fleaEventCooldownHrs: "이벤트 쿨다운(시간)",
  pendingExpireDays: "오프라인 pending 만료(일)",
  maxOfflineOps: "최대 오프라인 ops",
  emergencyMode: "긴급 모드",
  fraudRestrictScore: "거래 제한 점수",
  fraudMarketBlockScore: "장터 차단 점수",
  fraudLiveBlockScore: "라이브 차단 점수",
};

export type ConfigValidationError = { field: keyof EconomyConfigValues; message: string };

export function validateEconomyConfig(
  config: Partial<EconomyConfigValues>
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  const c = { ...ECONOMY_CONFIG_DEFAULTS, ...config };

  if (c.goldPerGem < 1) {
    errors.push({ field: "goldPerGem", message: "goldPerGem은 1 이상이어야 합니다." });
  }
  if (c.bonusRate < 0 || c.bonusRate > 1) {
    errors.push({ field: "bonusRate", message: "bonusRate는 0~100% 사이여야 합니다." });
  }
  if (c.marketFee < 0 || c.marketFee > 1) {
    errors.push({ field: "marketFee", message: "marketFee는 0~100% 사이여야 합니다." });
  }
  if (c.defaultFleaFee < 0 || c.defaultFleaFee > 1) {
    errors.push({ field: "defaultFleaFee", message: "defaultFleaFee는 0~100% 사이여야 합니다." });
  }
  if (c.discountDefaultRate < 0 || c.discountDefaultRate > 1) {
    errors.push({ field: "discountDefaultRate", message: "할인율은 0~100% 사이여야 합니다." });
  }
  if (c.dailyWatchGoldLimit > c.dailyGoldLimit) {
    errors.push({
      field: "dailyWatchGoldLimit",
      message: "시청 골드 한도는 일일 골드 한도를 초과할 수 없습니다.",
    });
  }
  if (c.dailyLiveGoldLimit > c.dailyGoldLimit) {
    errors.push({
      field: "dailyLiveGoldLimit",
      message: "라이브 골드 한도는 일일 골드 한도를 초과할 수 없습니다.",
    });
  }
  if (c.maxOfflineOps < 1) {
    errors.push({ field: "maxOfflineOps", message: "maxOfflineOps는 1 이상이어야 합니다." });
  }
  if (c.featuredRefreshHour < 0 || c.featuredRefreshHour > 23) {
    errors.push({ field: "featuredRefreshHour", message: "갱신 시각은 0~23 사이여야 합니다." });
  }

  return errors;
}

export function calcGoldFromGems(
  gems: number,
  config: Pick<EconomyConfigValues, "goldPerGem" | "bonusRate">
): number {
  const base = gems * config.goldPerGem;
  return base + Math.floor(base * config.bonusRate);
}

export const calcPreviewGoldFromGems = calcGoldFromGems;

/** @deprecated AptEconomyConfigDto 호환 */
export type AptEconomyConfigDto = Pick<
  EconomyConfigValues,
  | "goldPerGem"
  | "bonusRate"
  | "dailyGemExchangeLimit"
  | "liveGoldPerCheer"
  | "dailyLiveGoldLimit"
  | "liveWatchGoldPerMin"
  | "dailyWatchGoldLimit"
>;

export function toLegacyConfigDto(c: EconomyConfigValues): AptEconomyConfigDto {
  return {
    goldPerGem: c.goldPerGem,
    bonusRate: c.bonusRate,
    dailyGemExchangeLimit: c.dailyGemExchangeLimit,
    liveGoldPerCheer: c.liveGoldPerCheer,
    dailyLiveGoldLimit: c.dailyLiveGoldLimit,
    liveWatchGoldPerMin: c.liveWatchGoldPerMin,
    dailyWatchGoldLimit: c.dailyWatchGoldLimit,
  };
}
