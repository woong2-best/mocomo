/** QnA hub tab + create grid — not a Prisma `CommunityCategory` enum value. */
export const QNA_NSFW_CATEGORY_ID = "NSFW" as const;

export type QnaNsfwCategoryId = typeof QNA_NSFW_CATEGORY_ID;

export const QNA_NSFW_BLOCKED_TITLE = "성인만 가능";

export const QNA_NSFW_BLOCKED_MSG =
  "프로필에 등록된 생년월일 기준 만 19세 이상만 NSFW 카테고리를 이용할 수 있습니다.";

export function isQnaNsfwCategoryId(id: string | null | undefined): id is QnaNsfwCategoryId {
  return id === QNA_NSFW_CATEGORY_ID;
}
