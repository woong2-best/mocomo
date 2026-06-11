import type { CreatorWorkKind } from "@prisma/client";

export const CREATOR_WORK_KIND_LABEL: Record<CreatorWorkKind, string> = {
  WEBTOON: "일러스트",
  PHOTO: "사진",
  VIDEO: "영상",
};

export const CREATOR_WORK_KIND_DESC: Record<CreatorWorkKind, string> = {
  WEBTOON: "그림·일러스트 작품별 판매",
  PHOTO: "고화질 사진 세트 판매",
  VIDEO: "PD·영상 단편 판매",
};
