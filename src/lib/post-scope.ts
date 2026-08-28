import type { Prisma } from "@prisma/client";

/** 피드·프로필·검색 등 글로벌 플랫폼용 — 커뮤니티 채널 글 제외 */
export const platformPostWhere = {
  communityId: null,
} satisfies Prisma.PostWhereInput;

export function isCommunityScopedPost(post: { communityId?: string | null }): boolean {
  return Boolean(post.communityId);
}

/** 기존 where에 플랫폼 전용 조건 병합 */
export function withPlatformPostsOnly<T extends Prisma.PostWhereInput>(
  where: T
): Prisma.PostWhereInput {
  return { AND: [platformPostWhere, where] };
}
