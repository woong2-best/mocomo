import { ADULT_MIN_AGE, ADULT_VERIFICATION_REQUIRED_MSG } from "./constants";

export function isAdultVerified(user: { adultVerifiedAt: Date | null }): boolean {
  return !!user.adultVerifiedAt;
}

export function ageFromBirthDate(birth: Date, at = new Date()): number {
  let age = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function parsePortOneBirthDate(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    return null;
  }
  return d;
}

export function assertAdultVerified(user: { adultVerifiedAt: Date | null }): string | null {
  if (isAdultVerified(user)) return null;
  return ADULT_VERIFICATION_REQUIRED_MSG;
}

export function isAdultAge(birth: Date, at = new Date()): boolean {
  return ageFromBirthDate(birth, at) >= ADULT_MIN_AGE;
}
