/** Mobile mirror of web lot templates (keep in sync). */

import type { UsedUiText } from "@/features/marketplace/used-catalog";

export const SUBCULTURE_LOT_TEMPLATES = [
  {
    id: "TCG_LOT",
    label: "TCG lot",
    listingFormat: "LOT",
    productType: "TCG_CARD",
    titleHint: "[Lot] ○○ card set · ○○ cards",
    descriptionHint:
      "List included cards, key rares, total count, sleeve/toploader, and raw condition (NM/LP).",
  },
  {
    id: "PHOTOCARD_SET",
    label: "Photocard set",
    listingFormat: "SET",
    productType: "PHOTOCARD",
    titleHint: "[Set] ○○ album photocards · ○○ pcs",
    descriptionHint: "Member, version, bonus type, defects, and where you bought them.",
  },
  {
    id: "FIGURE_LOT",
    label: "Figure lot",
    listingFormat: "LOT",
    productType: "FIGURE",
    titleHint: "[Lot] figures & goods · ○○ items",
    descriptionHint: "Item list, box included, opened or not, missing parts.",
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
  _t?: UsedUiText
) {
  const en = LOT_TEMPLATE_EN[template.id];
  return {
    label: en?.labelEn ?? template.label,
    titleHint: en?.titleHintEn ?? template.titleHint,
    descriptionHint: en?.descriptionHintEn ?? template.descriptionHint,
  };
}
