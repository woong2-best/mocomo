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
    description: "Card lot · rare-focused",
    listingFormat: "LOT",
    productType: "TCG_CARD",
    titleHint: "[Lot] ○○ set cards ○○",
    descriptionHint:
      "List included cards, notable rares, total count, sleeve/top loader status, and raw condition (NM/LP).",
    meta: { itemCount: 10 },
  },
  {
    id: "TCG_BINDER",
    label: "TCG binder",
    description: "Binder lot · album lot",
    listingFormat: "BINDER",
    productType: "TCG_CARD",
    titleHint: "[Binder] ○○ binder lot",
    descriptionHint: "Binder type, approximate card count, photos of representative cards, optional full flip video link.",
    meta: { itemCount: 50 },
  },
  {
    id: "PHOTOCARD_SET",
    label: "Photocard set",
    description: "Album & bonus photocard bundle",
    listingFormat: "SET",
    productType: "PHOTOCARD",
    titleHint: "[Set] ○○ album photocards ○○",
    descriptionHint: "List member, version, bonus type, defects, and original purchase source.",
    meta: { itemCount: 5 },
  },
  {
    id: "FIGURE_LOT",
    label: "Figure lot",
    description: "Mixed figure & merch lot",
    listingFormat: "LOT",
    productType: "FIGURE",
    titleHint: "[Lot] figures & merch ○○",
    descriptionHint: "Item list, box included or not, opened or sealed, missing parts.",
    meta: { itemCount: 3 },
  },
  {
    id: "GOODS_MIX",
    label: "Mixed merch",
    description: "Mixed badges, acrylics, etc.",
    listingFormat: "LOT",
    productType: "CAN_BADGE",
    titleHint: "[Lot] ○○ mixed merch",
    descriptionHint: "Items, quantities, series titles. Representative photo + full spread photo recommended.",
    meta: { itemCount: 8 },
  },
];

export function getLotTemplate(id: LotTemplateId): LotTemplate | undefined {
  return SUBCULTURE_LOT_TEMPLATES.find((t) => t.id === id);
}
