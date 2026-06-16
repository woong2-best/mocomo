/** 게시글 미디어 — 목록/피드용 (용량 최소화) */
export const postMediaPreview = {
  take: 1,
  orderBy: { order: "asc" as const },
  select: { url: true, type: true },
};

/** 프로필·상세 — 여러 장 표시 */
export const postMediaGallery = {
  take: 8,
  orderBy: { order: "asc" as const },
  select: { id: true, url: true, type: true, order: true, priceKrw: true, purchaseCount: true },
};
