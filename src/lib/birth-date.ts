import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { parseBirthDateInput } from "@/lib/used-youth-protection";

export { parseBirthDateInput };

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
    return format(birth, "yyyy년 M월 d일", { locale: ko });
  }
  return format(birth, "M월 d일", { locale: ko });
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
    return { birth: null, error: "생년월일을 모두 입력하거나, 비우고 저장해 주세요." };
  }
  const birth = parseBirthDateInput(Number(y), Number(m), Number(d));
  if (!birth) return { birth: null, error: "올바른 생년월일을 입력해 주세요." };
  return { birth };
}
