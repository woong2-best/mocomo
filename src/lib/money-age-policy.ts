import { ageFromBirthDate } from "@/lib/adult-verification/is-verified";

/** Payments, tips, and transfers require a stored birth date and age 18+. */
export const MONEY_MIN_AGE = 18;

export const MONEY_AGE_BIRTH_DATE_REQUIRED =
  "Add your date of birth on your profile before using this feature.";
export const MONEY_AGE_UNDERAGE = "This feature is not available for this account.";

export const MONEY_AGE_CODE_MISSING = "MONEY_AGE_BIRTH_DATE_REQUIRED";
export const MONEY_AGE_CODE_UNDERAGE = "MONEY_AGE_UNDERAGE";

export type MoneyAgeReason = "missing" | "underage";

export type MoneyAgeStatus = {
  hasBirthDate: boolean;
  allowed: boolean;
  reason: MoneyAgeReason | null;
  age: number | null;
};

export function evaluateMoneyAge(
  birthDate: Date | null | undefined,
  at = new Date()
): MoneyAgeStatus {
  if (!birthDate) {
    return { hasBirthDate: false, allowed: false, reason: "missing", age: null };
  }
  const age = ageFromBirthDate(birthDate, at);
  if (age < MONEY_MIN_AGE) {
    return { hasBirthDate: true, allowed: false, reason: "underage", age };
  }
  return { hasBirthDate: true, allowed: true, reason: null, age };
}

export function moneyAgeBlockMessage(reason: MoneyAgeReason | null): string {
  if (reason === "underage") return MONEY_AGE_UNDERAGE;
  return MONEY_AGE_BIRTH_DATE_REQUIRED;
}

export function moneyAgeBlockFromRecord(
  birthDate: Date | null | undefined
): { error: string; code: string } | null {
  const status = evaluateMoneyAge(birthDate);
  if (status.allowed) return null;
  return {
    error: moneyAgeBlockMessage(status.reason),
    code: status.reason === "underage" ? MONEY_AGE_CODE_UNDERAGE : MONEY_AGE_CODE_MISSING,
  };
}

export function toPublicMoneyAge(status: MoneyAgeStatus) {
  return {
    allowed: status.allowed,
    reason: status.reason,
    hasBirthDate: status.hasBirthDate,
  };
}
