import type { Prisma, SupportTierLevel } from "@prisma/client";

export const DELETED_USER_DISPLAY_NAME = "탈퇴한 사용자";

/** 닉네임·아바타와 함께 노출할 공개 사용자 필드 (총 후원 등급 포함) */
export const userPublicSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  supportTierSent: true,
  postsLocked: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export const userPublicSelectMinimal = {
  id: true,
  username: true,
  image: true,
  supportTierSent: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export type UserPublicFields = {
  id: string;
  username: string;
  name?: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
  postsLocked?: boolean;
  deletedAt?: Date | null;
};

/** 프로필 설정 이름 — 피드·게시물·프로필·코스어 등 전역 표시용 */
export function userDisplayName(user: {
  username: string;
  name?: string | null;
  deletedAt?: Date | null;
}): string {
  if (user.deletedAt) return DELETED_USER_DISPLAY_NAME;
  return user.name?.trim() || user.username;
}

export function userAvatarFallbackInitial(user: {
  username: string;
  name?: string | null;
}): string {
  return userDisplayName(user)[0]?.toUpperCase() ?? "?";
}
