import type { BirthDateSource } from "@prisma/client";
import { ageFromBirthDate as computeAge } from "@/lib/adult-verification/is-verified";

export type AgePolicyPurpose = "adult" | "discovery" | "used_market";

export type UserAgeRecord = {
  birthDate: Date | null;
  countryCode: string;
  birthDateSource?: BirthDateSource | null;
  birthDateCollectedAt?: Date | null;
};

/** 국가별 최소 연령 — 향후 법률·정책 변경 시 이 테이블만 수정 */
const MIN_AGE_BY_COUNTRY: Record<string, Partial<Record<AgePolicyPurpose, number>>> = {
  KR: { adult: 19, discovery: 18, used_market: 19 },
  US: { adult: 18, discovery: 18, used_market: 18 },
  JP: { adult: 18, discovery: 18, used_market: 18 },
};

const DEFAULT_MIN_AGE: Record<AgePolicyPurpose, number> = {
  adult: 18,
  discovery: 18,
  used_market: 18,
};

export function resolveMinAge(countryCode: string, purpose: AgePolicyPurpose): number {
  const code = countryCode.trim().toUpperCase();
  return MIN_AGE_BY_COUNTRY[code]?.[purpose] ?? DEFAULT_MIN_AGE[purpose];
}

export function getUserAge(
  record: UserAgeRecord,
  referenceDate = new Date()
): number | null {
  if (!record.birthDate) return null;
  return computeAge(record.birthDate, referenceDate);
}

export function isAgeRequirementMet(
  record: UserAgeRecord,
  purpose: AgePolicyPurpose,
  referenceDate = new Date()
): boolean {
  const age = getUserAge(record, referenceDate);
  if (age == null) return false;
  return age >= resolveMinAge(record.countryCode, purpose);
}

/** Signup / profile update payload for birthDate metadata */
export function birthDateCollectionMeta(
  source: BirthDateSource
): { birthDateSource: BirthDateSource; birthDateCollectedAt: Date } {
  return { birthDateSource: source, birthDateCollectedAt: new Date() };
}
