import type { SubcultureListingFormat, SubcultureVerticalMeta } from "@/lib/subculture-commerce/types";
import type { SubcultureProductTypeId } from "@/lib/subculture-commerce/catalog";

export type LotTemplateId =
  | "TCG_LOT"
  | "TCG_BINDER"
  | "PHOTOCARD_SET"
  | "FIGURE_LOT"
  | "GOODS_MIX";

export type LotTemplate = {
  id: LotTemplateId;
  label: string;
  description: string;
  listingFormat: SubcultureListingFormat;
  productType?: SubcultureProductTypeId;
  titleHint: string;
  descriptionHint: string;
  meta?: Partial<SubcultureVerticalMeta>;
};

export const SUBCULTURE_LOT_TEMPLATES: LotTemplate[] = [
  {
    id: "TCG_LOT",
    label: "TCG Lot",
    description: "카드 묶음·레어 위주 lot",
    listingFormat: "LOT",
    productType: "TCG_CARD",
    titleHint: "[Lot] ○○ 세트 카드 ○○장",
    descriptionHint:
      "포함 카드 목록, 대표 레어, 전체 장수, 슬리브·탑로더 여부, raw 상태(NM/LP)를 적어 주세요.",
    meta: { itemCount: 10 },
  },
  {
    id: "TCG_BINDER",
    label: "TCG 바인더",
    description: "바인더 통·앨범 통",
    listingFormat: "BINDER",
    productType: "TCG_CARD",
    titleHint: "[바인더] ○○ 바인더 통",
    descriptionHint: "바인더 종류, 대략 장수, 대표 카드 사진, 전체 flip 영상 링크(선택).",
    meta: { itemCount: 50 },
  },
  {
    id: "PHOTOCARD_SET",
    label: "포카 세트",
    description: "앨범·특전 포카 묶음",
    listingFormat: "SET",
    productType: "PHOTOCARD",
    titleHint: "[세트] ○○ 앨범 포카 ○○장",
    descriptionHint: "멤버·버전·특전 종류, 하자, 원본 구매처를 적어 주세요.",
    meta: { itemCount: 5 },
  },
  {
    id: "FIGURE_LOT",
    label: "피규어 Lot",
    description: "피규어·굿즈 혼합 lot",
    listingFormat: "LOT",
    productType: "FIGURE",
    titleHint: "[Lot] 피규어·굿즈 ○○점",
    descriptionHint: "품목 리스트, 박스 유무, 개봉 여부, 누락 부품.",
    meta: { itemCount: 3 },
  },
  {
    id: "GOODS_MIX",
    label: "굿즈 혼합",
    description: "캔뱃지·아크릴 등 혼합",
    listingFormat: "LOT",
    productType: "CAN_BADGE",
    titleHint: "[Lot] ○○ 굿즈 혼합",
    descriptionHint: "품목·수량·작품명. 대표 사진 + 전체 spread 사진 권장.",
    meta: { itemCount: 8 },
  },
];

export function getLotTemplate(id: LotTemplateId): LotTemplate | undefined {
  return SUBCULTURE_LOT_TEMPLATES.find((t) => t.id === id);
}
