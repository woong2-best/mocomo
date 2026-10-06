import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { parseBirthDateInput } from "@/lib/used-youth-protection";

export { parseBirthDateInput };

/** 연·월·일 입력 — 숫자만 허용 */
export function sanitizeBirthDigitInput(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isUtcMidnight(value: Date): boolean {
  return (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

/** Calendar day key. UTC-midnight values use UTC parts; form input uses the local calendar day. */
export function birthDateKey(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  if (isUtcMidnight(value)) {
    return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
  }
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

/** Persist a calendar date as UTC midnight so @db.Date matches the day the user entered. */
export function toStoredBirthDate(value: Date): Date {
  if (isUtcMidnight(value)) return value;
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
}

export function formatBirthDateLabel(value: Date | null | undefined): string {
  return birthDateKey(value) ?? "—";
}

export function splitStoredBirthDate(birth: Date | null | undefined): {
  year: string;
  month: string;
  day: string;
} {
  if (!birth) return { year: "", month: "", day: "" };
  return {
    year: String(birth.getUTCFullYear()),
    month: String(birth.getUTCMonth() + 1),
    day: String(birth.getUTCDate()),
  };
}

/** 프로필에 표시 — 기본은 월·일만 (연도 비공개) */
export function formatProfileBirthday(
  birth: Date,
  options?: { includeYear?: boolean; isSelf?: boolean }
): string {
  const includeYear = options?.includeYear ?? options?.isSelf ?? false;
  if (includeYear) {
    return format(birth, "MMMM d, yyyy", { locale: ko });
  }
  return format(birth, "MMMM d", { locale: ko });
}

export function parseBirthDateFields(
  yearStr: string,
  monthStr: string,
  dayStr: string
): { birth: Date | null; error?: string } {
  const y = yearStr.trim();
  const m = monthStr.trim();
  const d = dayStr.trim();
  if (!y && !m && !d) return { birth: null };
  if (!y || !m || !d) {
    return { birth: null, error: "Enter your full birth date or leave all fields blank and save." };
  }
  const birth = parseBirthDateInput(Number(y), Number(m), Number(d));
  if (!birth) return { birth: null, error: "Enter a valid birth date." };
  return { birth };
}
