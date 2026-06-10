import type { CreatorWorkKind } from "@prisma/client";

export const CREATOR_WORK_KIND_LABEL: Record<CreatorWorkKind, string> = {
  WEBTOON: "웹툰 연재",
  PHOTO: "사진",
  VIDEO: "영상",
};

export const CREATOR_WORK_KIND_DESC: Record<CreatorWorkKind, string> = {
  WEBTOON: "회차별 유료·무료 미리보기",
  PHOTO: "고화질 사진 세트 판매",
  VIDEO: "PD·영상 단편 판매",
};
