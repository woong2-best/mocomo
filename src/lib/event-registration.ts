/** 사용자 이벤트 등록비 (결제 후 목록 공개) */
export const EVENT_REGISTRATION_FEE_KRW = 30_000;

export const EVENT_TYPES = [
  { id: "fanart", label: "팬아트" },
  { id: "cosplay", label: "코스프레" },
  { id: "goods", label: "굿즈 추첨" },
  { id: "meetup", label: "모임·오프라인" },
  { id: "other", label: "기타" },
] as const;

export type EventLinkInput = { label: string; url: string };
