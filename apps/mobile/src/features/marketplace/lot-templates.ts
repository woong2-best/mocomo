/** Mobile mirror of web lot templates (keep in sync). */

export const SUBCULTURE_LOT_TEMPLATES = [
  {
    id: "TCG_LOT",
    label: "TCG Lot",
    listingFormat: "LOT",
    productType: "TCG_CARD",
    titleHint: "[Lot] ○○ 세트 카드 ○○장",
    descriptionHint:
      "포함 카드 목록, 대표 레어, 전체 장수, 슬리브·탑로더 여부, raw 상태(NM/LP)를 적어 주세요.",
  },
  {
    id: "PHOTOCARD_SET",
    label: "포카 세트",
    listingFormat: "SET",
    productType: "PHOTOCARD",
    titleHint: "[세트] ○○ 앨범 포카 ○○장",
    descriptionHint: "멤버·버전·특전 종류, 하자, 원본 구매처를 적어 주세요.",
  },
  {
    id: "FIGURE_LOT",
    label: "피규어 Lot",
    listingFormat: "LOT",
    productType: "FIGURE",
    titleHint: "[Lot] 피규어·굿즈 ○○점",
    descriptionHint: "품목 리스트, 박스 유무, 개봉 여부, 누락 부품.",
  },
] as const;
