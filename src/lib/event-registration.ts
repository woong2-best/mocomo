/** 사용자 이벤트 등록비 (결제 후 목록 공개) */
export const EVENT_REGISTRATION_FEE_KRW = 30_000;

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
