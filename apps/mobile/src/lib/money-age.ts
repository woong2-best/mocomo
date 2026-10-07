import type { MobileAuthUser } from "@/auth/types";

export type MoneyAgeReason = "missing" | "underage";

export type PublicMoneyAge = {
  allowed: boolean;
  reason: MoneyAgeReason | null;
  hasBirthDate: boolean;
  minAge?: number;
};

export function moneyAgeFromUser(user: MobileAuthUser | null | undefined): PublicMoneyAge | null {
  return user?.moneyAge ?? null;
}

export function isMoneyAgeBlocked(user: MobileAuthUser | null | undefined): boolean {
  const status = moneyAgeFromUser(user);
  return Boolean(status && !status.allowed);
}
