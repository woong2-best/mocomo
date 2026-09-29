/** Mobile mirror of web lot templates (keep in sync). */

import type { UsedUiText } from "@/features/marketplace/used-catalog";

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

const LOT_TEMPLATE_EN: Record<
  string,
  { labelEn: string; titleHintEn: string; descriptionHintEn: string }
> = {
  TCG_LOT: {
    labelEn: "TCG lot",
    titleHintEn: "[Lot] ○○ card set · ○○ cards",
    descriptionHintEn:
      "List included cards, key rares, total count, sleeve/toploader, and raw condition (NM/LP).",
  },
  PHOTOCARD_SET: {
    labelEn: "Photocard set",
    titleHintEn: "[Set] ○○ album photocards · ○○ pcs",
    descriptionHintEn: "Member, version, bonus type, defects, and where you bought them.",
  },
  FIGURE_LOT: {
    labelEn: "Figure lot",
    titleHintEn: "[Lot] figures & goods · ○○ items",
    descriptionHintEn: "Item list, box included, opened or not, missing parts.",
  },
};

export function localizedLotTemplate(
  template: (typeof SUBCULTURE_LOT_TEMPLATES)[number],
  u: UsedUiText
) {
  const en = LOT_TEMPLATE_EN[template.id];
  if (!en) {
    return {
      label: template.label,
      titleHint: template.titleHint,
      descriptionHint: template.descriptionHint,
    };
  }
  return {
    label: u(template.label, en.labelEn),
    titleHint: u(template.titleHint, en.titleHintEn),
    descriptionHint: u(template.descriptionHint, en.descriptionHintEn),
  };
}
