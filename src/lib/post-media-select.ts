/** 피드 그리드 — 최대 4장 미리보기 + 라이트박스용 여유 분량 */
export const POST_MEDIA_FEED_TAKE = 4;

/** 프로필·상세·라이트박스 — 실질적으로 무제한에 가까운 상한 */
export const POST_MEDIA_FULL_TAKE = 100;

/** 게시글 미디어 — 목록/피드용 (그리드 4장) */
export const postMediaPreview = {
  take: POST_MEDIA_FEED_TAKE,
  orderBy: { order: "asc" as const },
  select: { id: true, url: true, type: true, priceKrw: true },
};

/** 프로필·상세 — 여러 장 표시 */
export const postMediaGallery = {
  take: POST_MEDIA_FULL_TAKE,
  orderBy: { order: "asc" as const },
  select: { id: true, url: true, type: true, order: true, priceKrw: true, purchaseCount: true },
};

/** 프로필 타임라인 — 유료 미디어 id 포함 */
export const postMediaProfileTimeline = {
  take: POST_MEDIA_FULL_TAKE,
  orderBy: { order: "asc" as const },
  select: { id: true, url: true, type: true, order: true, priceKrw: true },
};
