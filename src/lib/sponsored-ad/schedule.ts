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

export function validateSponsoredAdDays(days: number): string | null {
  if (!Number.isInteger(days) || days < 1) {
    return "게재 기간은 1일 이상 선택해 주세요.";
  }
  if (days > SPONSORED_AD_MAX_DAYS) {
    return `광고 기간은 최대 ${SPONSORED_AD_MAX_DAYS}일까지 가능합니다.`;
  }
  return null;
}

export function validateSponsoredAdSchedule(
  startTime: Date,
  days: number,
  now = new Date()
): string | null {
  return validateSponsoredAdStartTime(startTime, now) ?? validateSponsoredAdDays(days);
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

export function sponsoredAdScheduleSummary(startTime: Date, days: number) {
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
