import type { UsedRestrictedKind } from "@prisma/client";
import { ageFromBirthDate } from "@/lib/adult-verification/is-verified";
import { ADULT_MIN_AGE } from "@/lib/adult-verification/constants";

/** 주류·담배·성인용품 거래 최소 연령 (만 나이) */
export { ADULT_MIN_AGE as USED_ADULT_MIN_AGE } from "@/lib/adult-verification/constants";

export const USED_RESTRICTED_OPTIONS = [
  { value: "NONE" as const, label: "해당 없음 (일반 상품)" },
  { value: "ALCOHOL" as const, label: "술·주류" },
  { value: "TOBACCO" as const, label: "담배·니코틴 제품" },
  { value: "ADULT" as const, label: "성인용품" },
] as const;

export const USED_ADULT_REQUIRED_MSG =
  "술·담배·성인용품은 만 19세 이상(생년월일 등록) 계정만 구매·입찰·거래 문의가 가능합니다.";

export const USED_ADULT_SELLER_MSG =
  "해당 품목을 등록하려면 프로필에 만 19세 이상 생년월일을 등록해 주세요.";

export function isUsedRestrictedKind(
  kind: UsedRestrictedKind | string | null | undefined
): kind is Exclude<UsedRestrictedKind, "NONE"> {
  return kind === "ALCOHOL" || kind === "TOBACCO" || kind === "ADULT";
}

export function usedRestrictedLabel(kind: UsedRestrictedKind | string): string {
  if (kind === "ALCOHOL") return "술·주류";
  if (kind === "TOBACCO") return "담배";
  if (kind === "ADULT") return "성인용품";
  return "";
}

export function isUsedAdultVerified(user: { birthDate: Date | null }): boolean {
  if (!user.birthDate) return false;
  return usedAgeFromBirthDate(user.birthDate) >= ADULT_MIN_AGE;
}

export function usedAgeFromBirthDate(birth: Date, at = new Date()): number {
  return ageFromBirthDate(birth, at);
}

export function parseBirthDateInput(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (year < 1900 || year > new Date().getFullYear()) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  if (d > new Date()) return null;
  return d;
}

export function assertUsedAdultForRestricted(
  user: { birthDate: Date | null },
  restrictedKind: UsedRestrictedKind | string
): string | null {
  if (!isUsedRestrictedKind(restrictedKind)) return null;
  if (isUsedAdultVerified(user)) return null;
  return USED_ADULT_REQUIRED_MSG;
}

export function usedAdultVerifyUrl(listingId: string, kind?: string) {
  const params = new URLSearchParams({
    callbackUrl: `/used/${listingId}`,
  });
  if (kind && kind !== "NONE") params.set("kind", kind);
  return `/used/adult-verify?${params.toString()}`;
}
