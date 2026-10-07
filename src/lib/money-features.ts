import { db } from "@/lib/db";
import { evaluateMoneyAge } from "@/lib/money-age-policy";

/** Neutral API / action message — do not mention the minimum age. */
export const MONEY_FEATURE_UNAVAILABLE = "This feature is not available for this account.";
export const MONEY_FEATURE_UNAVAILABLE_CODE = "MONEY_FEATURE_UNAVAILABLE";

export type MoneyFeatureUser = { birthDate: Date | null | undefined };

export function canUseMoneyFeatures(user: MoneyFeatureUser): boolean {
  return evaluateMoneyAge(user.birthDate ?? null).allowed;
}

export async function canUseMoneyFeaturesByUserId(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { birthDate: true },
  });
  return canUseMoneyFeatures({ birthDate: user?.birthDate ?? null });
}

export async function assertCanUseMoneyFeatures(
  userId: string
): Promise<{ error: string; code: string; status: 403 } | null> {
  if (await canUseMoneyFeaturesByUserId(userId)) return null;
  return {
    error: MONEY_FEATURE_UNAVAILABLE,
    code: MONEY_FEATURE_UNAVAILABLE_CODE,
    status: 403,
  };
}
