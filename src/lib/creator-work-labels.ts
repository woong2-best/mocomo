import type { CreatorWorkKind } from "@prisma/client";

export const CREATOR_WORK_KIND_LABEL: Record<CreatorWorkKind, string> = {
  WEBTOON: "Illustration",
  PHOTO: "Photo",
  VIDEO: "Video",
};

export const CREATOR_WORK_KIND_DESC: Record<CreatorWorkKind, string> = {
  WEBTOON: "Sell artwork and illustrations individually",
  PHOTO: "Sell high-quality photo sets",
  VIDEO: "Sell director/video short films",
};
