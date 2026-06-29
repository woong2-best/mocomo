import { isEconomyEmergencyMode } from "./config-service";
import { isEconomyFeatureEnabled } from "./feature-flag-service";
import {
  FEATURE_DISABLED_MESSAGES,
  type EconomyFeatureKey,
} from "./feature-flag-types";

export const EMERGENCY_MSG = "긴급 점검 중입니다. 잠시 후 다시 시도해 주세요.";

async function assertFeature(key: EconomyFeatureKey): Promise<void> {
  if (await isEconomyEmergencyMode()) {
    throw new Error(EMERGENCY_MSG);
  }
  if (!(await isEconomyFeatureEnabled(key))) {
    throw new Error(FEATURE_DISABLED_MESSAGES[key]);
  }
}

export async function assertMarketEnabled(): Promise<void> {
  await assertFeature("market");
}

export async function assertShopEnabled(): Promise<void> {
  await assertFeature("shop");
}

export async function assertLiveRewardEnabled(): Promise<void> {
  await assertFeature("live");
}

export async function assertFleaEnabled(): Promise<void> {
  if (await isEconomyEmergencyMode()) {
    throw new Error(EMERGENCY_MSG);
  }
  if (!(await isEconomyFeatureEnabled("flea"))) {
    throw new Error(FEATURE_DISABLED_MESSAGES.flea);
  }
  if (!(await isEconomyFeatureEnabled("market"))) {
    throw new Error(FEATURE_DISABLED_MESSAGES.market);
  }
}

export async function assertMissionEnabled(): Promise<void> {
  await assertFeature("mission");
}

export async function assertIapEnabled(): Promise<void> {
  await assertFeature("iap");
}

/** 오프라인 창고 동기화 — 긴급/킬스위치 시 차단 */
export async function assertOfflineSyncEnabled(): Promise<void> {
  if (await isEconomyEmergencyMode()) {
    throw new Error(EMERGENCY_MSG);
  }
  if (!(await isEconomyFeatureEnabled("shop"))) {
    throw new Error(FEATURE_DISABLED_MESSAGES.shop);
  }
}

/** 알림 차단 시 false — throw 대신 no-op용 */
export async function isEconomyNotificationDeliveryEnabled(): Promise<boolean> {
  if (await isEconomyEmergencyMode()) return false;
  return isEconomyFeatureEnabled("notification");
}
