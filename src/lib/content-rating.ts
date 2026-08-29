import type { ContentRating } from "@prisma/client";

export type { ContentRating };

export const CONTENT_RATINGS: ContentRating[] = ["GENERAL", "ADULT"];

export function isAdultContent(rating: ContentRating | boolean | null | undefined): boolean {
  if (typeof rating === "boolean") return rating;
  return rating === "ADULT";
}

export function contentRatingFromNsfw(isNsfw: boolean): ContentRating {
  return isNsfw ? "ADULT" : "GENERAL";
}

export function nsfwFromContentRating(rating: ContentRating): boolean {
  return rating === "ADULT";
}

export function parseContentRating(value: unknown): ContentRating | null {
  if (value === "GENERAL" || value === "ADULT") return value;
  if (value === "general") return "GENERAL";
  if (value === "adult" || value === "nsfw") return "ADULT";
  if (value === true || value === "true" || value === "on") return "ADULT";
  if (value === false || value === "false" || value === "off") return "GENERAL";
  return null;
}

export function requireContentRating(value: unknown): ContentRating | { error: string } {
  const parsed = parseContentRating(value);
  if (!parsed) {
    return { error: "콘텐츠 유형(일반/성인)을 선택해 주세요." };
  }
  return parsed;
}

export function contentRatingLabel(rating: ContentRating, locale = "ko"): string {
  if (locale === "en") {
    return rating === "ADULT" ? "Adult content" : "General";
  }
  return rating === "ADULT" ? "성인 콘텐츠" : "일반";
}
