import type { Prisma, SupportTierLevel } from "@prisma/client";

/** 닉네임·아바타와 함께 노출할 공개 사용자 필드 (총 후원 등급 포함) */
export const userPublicSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  level: true,
  supportTierSent: true,
  cosplayerProfile: { select: { stageName: true } },
} satisfies Prisma.UserSelect;

export const userPublicSelectMinimal = {
  id: true,
  username: true,
  image: true,
  supportTierSent: true,
} satisfies Prisma.UserSelect;

export type UserPublicFields = {
  id: string;
  username: string;
  name?: string | null;
  image: string | null;
  level?: number;
  supportTierSent: SupportTierLevel;
  cosplayerProfile?: { stageName: string | null } | null;
};

export function userDisplayName(user: {
  username: string;
  name?: string | null;
  cosplayerProfile?: { stageName: string | null } | null;
}): string {
  return user.cosplayerProfile?.stageName || user.name || user.username;
}
