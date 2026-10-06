import { db } from "@/lib/db";
import {
  evaluateMoneyAge,
  moneyAgeBlockMessage,
  MONEY_AGE_CODE_MISSING,
  MONEY_AGE_CODE_UNDERAGE,
  type MoneyAgeStatus,
} from "@/lib/money-age-policy";

export {
  evaluateMoneyAge,
  moneyAgeBlockFromRecord,
  moneyAgeBlockMessage,
  toPublicMoneyAge,
  MONEY_AGE_BIRTH_DATE_REQUIRED,
  MONEY_AGE_CODE_MISSING,
  MONEY_AGE_CODE_UNDERAGE,
  MONEY_AGE_UNDERAGE,
  MONEY_MIN_AGE,
} from "@/lib/money-age-policy";
export type { MoneyAgeReason, MoneyAgeStatus } from "@/lib/money-age-policy";

export async function getMoneyAgeStatus(userId: string): Promise<MoneyAgeStatus> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { birthDate: true },
  });
  return evaluateMoneyAge(user?.birthDate ?? null);
}

export async function assertMoneyAgeAllowed(
  userId: string
): Promise<{ error: string; code: string } | null> {
  const status = await getMoneyAgeStatus(userId);
  if (status.allowed) return null;
  return {
    error: moneyAgeBlockMessage(status.reason),
    code: status.reason === "underage" ? MONEY_AGE_CODE_UNDERAGE : MONEY_AGE_CODE_MISSING,
  };
}
