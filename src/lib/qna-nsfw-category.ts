/** QnA hub tab + create grid — not a Prisma `CommunityCategory` enum value. */
export const QNA_NSFW_CATEGORY_ID = "NSFW" as const;

export type QnaNsfwCategoryId = typeof QNA_NSFW_CATEGORY_ID;

export const QNA_NSFW_BLOCKED_TITLE = "Adults only";

export const QNA_NSFW_BLOCKED_MSG =
  "Only users aged 19+ by the birth date on their profile can use NSFW categories.";

export function isQnaNsfwCategoryId(id: string | null | undefined): id is QnaNsfwCategoryId {
  return id === QNA_NSFW_CATEGORY_ID;
}
