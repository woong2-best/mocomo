/** 사용자 이벤트 등록비 — 하루 1,000원, 최대 100일 (결제 후 목록 공개) */
export const EVENT_REGISTRATION_FEE_PER_DAY_KRW = 1_000;
export const EVENT_REGISTRATION_MAX_DAYS = 100;
export const EVENT_REGISTRATION_MAX_FEE_KRW =
  EVENT_REGISTRATION_FEE_PER_DAY_KRW * EVENT_REGISTRATION_MAX_DAYS;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** 시작일~종료일 기간(일). 부분 하루는 올림, 최소 1일. */
export function eventDurationDays(
  startsAt: Date | string,
  endsAt: Date | string
): number {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 1;
  return Math.max(1, Math.ceil(ms / MS_PER_DAY));
}

export function calcEventRegistrationFee(
  startsAt: Date | string,
  endsAt: Date | string
): number {
  const days = eventDurationDays(startsAt, endsAt);
  if (days > EVENT_REGISTRATION_MAX_DAYS) {
    throw new Error(`이벤트 기간은 최대 ${EVENT_REGISTRATION_MAX_DAYS}일까지 가능합니다.`);
  }
  return days * EVENT_REGISTRATION_FEE_PER_DAY_KRW;
}

export function eventRegistrationFeeLabel(
  startsAt: Date | string,
  endsAt: Date | string
): string {
  const days = eventDurationDays(startsAt, endsAt);
  const fee = Math.min(
    days * EVENT_REGISTRATION_FEE_PER_DAY_KRW,
    EVENT_REGISTRATION_MAX_FEE_KRW
  );
  return `${fee.toLocaleString()}원 (${days}일 × ${EVENT_REGISTRATION_FEE_PER_DAY_KRW.toLocaleString()}원)`;
}

export const EVENT_TYPES = [
  { id: "fanart", label: "팬아트" },
  { id: "cosplay", label: "코스프레" },
  { id: "goods", label: "굿즈" },
  { id: "meetup", label: "오프라인" },
  { id: "virtual", label: "버츄얼" },
  { id: "other", label: "이벤트" },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["id"];

/** 상단 카테고리 라인 (부가 기능 안내) */
export const EVENT_CATEGORY_LINE = [
  "팬아트",
  "코스프레",
  "굿즈",
  "오프라인",
  "버츄얼",
] as const;

/** 필터 태그 — #해시 형태 */
export const EVENT_FILTER_TAGS = [
  { id: "all", label: "전체", hash: null },
  { id: "fanart", label: "팬아트", hash: "#팬아트" },
  { id: "cosplay", label: "코스프레", hash: "#코스프레" },
  { id: "goods", label: "굿즈", hash: "#굿즈" },
  { id: "virtual", label: "버츄얼", hash: "#버츄얼" },
  { id: "meetup", label: "행사", hash: "#행사" },
  { id: "other", label: "이벤트", hash: "#이벤트" },
] as const;

export type EventLinkInput = { label: string; url: string };

export function eventTypeLabel(type: string): string {
  return EVENT_TYPES.find((t) => t.id === type)?.label ?? type;
}

/** D-Day until endsAt (contest deadline) */
export function eventDday(endsAt: Date | string): string {
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  if (Number.isNaN(end.getTime())) return "—";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round(
    (startOfEnd.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "D-Day";
  if (diff < 0) return "종료";
  return `D-${diff}`;
}
