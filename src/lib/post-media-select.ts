/**
 * 피드·목록용 미디어 take.
 * 그리드는 클라이언트에서 4장만 보여도, 라이트박스는 열자마자 전체가 필요하므로
 * URL 메타는 전부 내려준다 (이미지 바이트는 여전히 lazy).
 */
export const POST_MEDIA_FEED_TAKE = 100;

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

/** 프로필 타임라인 — 유료 미디어 id 포함 */
export const postMediaProfileTimeline = {
  take: POST_MEDIA_FULL_TAKE,
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
