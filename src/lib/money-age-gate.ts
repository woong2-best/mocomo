import { db } from "@/lib/db";
import { evaluateMoneyAge, type MoneyAgeStatus } from "@/lib/money-age-policy";
import { assertCanUseMoneyFeatures } from "@/lib/money-features";

export {
  evaluateMoneyAge,
  moneyAgeBlockFromRecord,
  toPublicMoneyAge,
  MONEY_AGE_BIRTH_DATE_REQUIRED,
  MONEY_AGE_CODE_MISSING,
  MONEY_AGE_CODE_UNDERAGE,
  MONEY_AGE_UNDERAGE,
  MONEY_MIN_AGE,
} from "@/lib/money-age-policy";
export type { MoneyAgeReason, MoneyAgeStatus } from "@/lib/money-age-policy";
export { canUseMoneyFeatures, MONEY_FEATURE_UNAVAILABLE, MONEY_FEATURE_UNAVAILABLE_CODE } from "@/lib/money-features";

export async function getMoneyAgeStatus(userId: string): Promise<MoneyAgeStatus> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { birthDate: true },
  });
  return evaluateMoneyAge(user?.birthDate ?? null);
}

/** Server-side money-feature gate. Returns a 403-style error when the user cannot use money features. */
export async function assertMoneyAgeAllowed(
  userId: string
): Promise<{ error: string; code: string; status: 403 } | null> {
  return assertCanUseMoneyFeatures(userId);
}
