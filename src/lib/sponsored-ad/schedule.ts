import { differenceInCalendarDays, startOfDay } from "date-fns";
import {
  MS_PER_DAY,
  SPONSORED_AD_MAX_DAYS,
  calcSponsoredAdMoco,
} from "@/lib/sponsored-ad/constants";

/** startTime + (days × 24h) */
export function calcSponsoredAdEndTime(startTime: Date, days: number): Date {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("INVALID_SPONSORED_AD_DAYS");
  }
  return new Date(startTime.getTime() + days * MS_PER_DAY);
}

export function validateSponsoredAdStartTime(startTime: Date, now = new Date()): string | null {
  if (Number.isNaN(startTime.getTime())) return "날짜가 올바르지 않습니다.";
  if (startTime.getTime() < now.getTime()) {
    return "시작 일시는 현재 시각 이후여야 합니다.";
  }
  return null;
}

export function validateSponsoredAdDays(
  days: number,
  maxDays = SPONSORED_AD_MAX_DAYS
): string | null {
  if (!Number.isInteger(days) || days < 1) {
    return "게재 기간은 1일 이상 선택해 주세요.";
  }
  if (days > maxDays) {
    return `광고 기간은 최대 ${maxDays}일까지 가능합니다.`;
  }
  return null;
}

export type SponsoredAdScheduleValidationOptions = {
  skipPastCheck?: boolean;
  maxDays?: number;
};

export function validateSponsoredAdSchedule(
  startTime: Date,
  days: number,
  now = new Date(),
  options?: SponsoredAdScheduleValidationOptions
): string | null {
  if (!options?.skipPastCheck) {
    const pastErr = validateSponsoredAdStartTime(startTime, now);
    if (pastErr) return pastErr;
  }
  return validateSponsoredAdDays(days, options?.maxDays ?? SPONSORED_AD_MAX_DAYS);
}

/** 5분 단위 올림 — 기본 시작 시각 */
export function roundUpToNextFiveMinutes(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const mod = d.getMinutes() % 5;
  if (mod !== 0) d.setMinutes(d.getMinutes() + (5 - mod));
  if (d.getTime() <= date.getTime()) d.setMinutes(d.getMinutes() + 5);
  return d;
}

export function defaultSponsoredAdStartTime(now = new Date()): Date {
  return roundUpToNextFiveMinutes(now);
}

const SCHEDULE_FMT = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatSponsoredAdDateTime(d: Date): string {
  return SCHEDULE_FMT.format(d);
}

export function sponsoredAdScheduleSummary(
  startTime: Date,
  days: number,
  options?: { unlimited?: boolean }
) {
  if (options?.unlimited) {
    return {
      startLabel: formatSponsoredAdDateTime(startTime),
      endLabel: "제한 없음 (삭제할 때까지)",
      moco: 0,
      endTime: null as Date | null,
    };
  }
  const endTime = calcSponsoredAdEndTime(startTime, days);
  return {
    startLabel: formatSponsoredAdDateTime(startTime),
    endLabel: formatSponsoredAdDateTime(endTime),
    moco: calcSponsoredAdMoco(days),
    endTime,
  };
}

/** datetime-local 호환 ISO slice (로컬) */
export function toLocalDateTimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseLocalDateTimeInputValue(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 달력 시작일~종료일 → 24시간 단위 일수 (최소 1일) */
export function daysFromCalendarRange(startDay: Date, endDay: Date): number {
  const diff = differenceInCalendarDays(startOfDay(endDay), startOfDay(startDay));
  return Math.max(1, diff);
}

/** 종료 달력일 (시작일 + days) — Sep 13 + 1일 → Sep 14 */
export function endDayFromStartAndDays(startDay: Date, days: number): Date {
  const end = startOfDay(startDay);
  end.setDate(end.getDate() + days);
  return end;
}

export function combineDateAndTime(day: Date, hour: number, minute: number): Date {
  const d = startOfDay(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}
