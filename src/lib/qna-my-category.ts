/** QnA hub tab — not a Prisma `CommunityCategory` enum value. */
export const QNA_MY_CATEGORY_ID = "MY" as const;

export type QnaMyCategoryId = typeof QNA_MY_CATEGORY_ID;

export function isQnaMyCategoryId(id: string | null | undefined): id is QnaMyCategoryId {
  return id === QNA_MY_CATEGORY_ID;
}
