/**
 * 피드·목록용 미디어 take.
 * 카드/캐러셀은 4~8장만 보여도 충분하고, 라이트박스·전체 갤러리는
 * `/api/posts/[id]/media` 프리페치로 나머지 URL을 가져온다 (이미지 바이트는 lazy).
 */
export const POST_MEDIA_FEED_TAKE = 8;

/** 프로필·상세·라이트박스 — 실질적으로 무제한에 가까운 상한 */
export const POST_MEDIA_FULL_TAKE = 100;

/** 게시글 미디어 — 목록/피드용 (라이트박스용 전체 URL 포함, UI 그리드는 4장) */
export const postMediaPreview = {
  take: POST_MEDIA_FEED_TAKE,
  orderBy: { order: "asc" as const },
  select: {
    id: true,
    url: true,
    type: true,
    priceKrw: true,
    width: true,
    height: true,
    duration: true,
    hlsUrl: true,
    posterUrl: true,
  },
};

/** 프로필·상세 — 여러 장 표시 */
export const postMediaGallery = {
  take: POST_MEDIA_FULL_TAKE,
  orderBy: { order: "asc" as const },
  select: {
    id: true,
    url: true,
    type: true,
    order: true,
    priceKrw: true,
    purchaseCount: true,
    width: true,
    height: true,
    duration: true,
    hlsUrl: true,
    posterUrl: true,
  },
};

/** 프로필 타임라인 — 카드뷰용 (피드와 동일 상한, 라이트박스는 prefetch) */
export const postMediaProfileTimeline = {
  take: POST_MEDIA_FEED_TAKE,
  orderBy: { order: "asc" as const },
  select: {
    id: true,
    url: true,
    type: true,
    order: true,
    priceKrw: true,
    width: true,
    height: true,
    duration: true,
    hlsUrl: true,
    posterUrl: true,
  },
};
