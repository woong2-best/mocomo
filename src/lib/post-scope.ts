import type { Prisma } from "@prisma/client";

/** 피드·프로필·검색 등 글로벌 플랫폼용 — 커뮤니티 채널 글·탈퇴 사용자 글 제외 */
export const platformPostWhere = {
  communityId: null,
  author: { deletedAt: null },
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

/** QnA(community) 글은 좋아요·재게시 대상이 아니다. null이면 허용. */
export function qnaEngagementError(communityId: string | null | undefined): string | null {
  if (communityId) return "QnA에서는 좋아요와 재게시를 사용할 수 없습니다.";
  return null;
}
