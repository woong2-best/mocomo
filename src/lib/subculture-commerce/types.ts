/** Shared subculture commerce enums — mirrored in Prisma schema. */

export const SUBCULTURE_CONDITION_GRADES = [
  { id: "NEW", label: "Sealed · like new" },
  { id: "LIKE_NEW", label: "Like new" },
  { id: "NM", label: "NM (Near Mint)" },
  { id: "LP", label: "LP (Light Played)" },
  { id: "MP", label: "MP (Moderate Played)" },
  { id: "HP", label: "HP (Heavy Played)" },
  { id: "POOR", label: "Damaged · defects" },
  { id: "UNKNOWN", label: "Condition not specified" },
] as const;

export type SubcultureConditionGrade =
  (typeof SUBCULTURE_CONDITION_GRADES)[number]["id"];

export const SUBCULTURE_LIMITED_KINDS = [
  { id: "STANDARD", label: "General sale" },
  { id: "EVENT_EXCLUSIVE", label: "Event exclusive" },
  { id: "VENUE_ONLY", label: "Venue-exclusive · in-person only" },
  { id: "PREORDER", label: "Pre-order" },
  { id: "COLLAB", label: "Collab · limited" },
  { id: "LIMITED_RUN", label: "Limited quantity" },
  { id: "LOTTERY", label: "Lottery · kuji" },
  { id: "PROMO", label: "Promo · bonus" },
] as const;

export type SubcultureLimitedKind = (typeof SUBCULTURE_LIMITED_KINDS)[number]["id"];

export const SUBCULTURE_LISTING_FORMATS = [
  { id: "SINGLE", label: "Single item" },
  { id: "LOT", label: "Lot · bundle" },
  { id: "SET", label: "Set · complete set" },
  { id: "BINDER", label: "Binder · album" },
  { id: "BOX", label: "Box · pack" },
] as const;

export type SubcultureListingFormat =
  (typeof SUBCULTURE_LISTING_FORMATS)[number]["id"];

export const SUBCULTURE_TRADE_MODES = [
  { id: "SELL", label: "Sell only" },
  { id: "TRADE", label: "Trade only (WTT)" },
  { id: "SELL_OR_TRADE", label: "Sell & trade" },
] as const;

export type SubcultureTradeMode = (typeof SUBCULTURE_TRADE_MODES)[number]["id"];

export const SUBCULTURE_ITEM_ORIGINS = [
  { id: "OFFICIAL", label: "Official · authentic" },
  { id: "FANMADE", label: "Fan mail · doujin · fan-made" },
  { id: "BOOTLEG_UNKNOWN", label: "Unknown source · suspected counterfeit" },
] as const;

export type SubcultureItemOrigin = (typeof SUBCULTURE_ITEM_ORIGINS)[number]["id"];

export const SUBCULTURE_PACKAGING_STATES = [
  { id: "SEALED", label: "Sealed" },
  { id: "OPENED_COMPLETE", label: "Opened · complete contents" },
  { id: "OPENED_INCOMPLETE", label: "Opened · missing parts" },
  { id: "LOOSE", label: "Loose · figure only" },
  { id: "NA", label: "Not applicable" },
] as const;

export type SubculturePackagingState =
  (typeof SUBCULTURE_PACKAGING_STATES)[number]["id"];

/** Vertical-specific optional metadata (stored as JSON). */
export type SubcultureVerticalMeta = {
  /** TCG — set code or name */
  tcgSet?: string;
  /** TCG — card number e.g. 025/165 */
  tcgNumber?: string;
  /** TCG — rarity */
  tcgRarity?: string;
  /** TCG — language */
  tcgLanguage?: string;
  /** PSA / BGS / CGC */
  graded?: boolean;
  grader?: string;
  grade?: string;
  certNumber?: string;
  /** K-pop photocard */
  album?: string;
  member?: string;
  pcVersion?: string;
  /** Figure / plamodel */
  manufacturer?: string;
  scale?: string;
  /** Doujin / event */
  eventName?: string;
  circleName?: string;
  /** Cosplay */
  sizeLabel?: string;
  /** Trade wants (WTT) */
  tradeWants?: string;
  /** Lot count */
  itemCount?: number;
};

export type SubcultureListingFields = {
  characterName?: string | null;
  conditionGrade?: SubcultureConditionGrade | null;
  limitedKind?: SubcultureLimitedKind | null;
  listingFormat?: SubcultureListingFormat | null;
  tradeMode?: SubcultureTradeMode | null;
  itemOrigin?: SubcultureItemOrigin | null;
  packagingState?: SubculturePackagingState | null;
  subcultureMeta?: SubcultureVerticalMeta | null;
};

export type SubcultureListingInput = SubcultureListingFields & {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
};

/** Form/API string values → typed fields (validated again in normalize). */
export function coerceSubcultureListingFields(raw: {
  characterName?: string | null;
  conditionGrade?: string | null;
  limitedKind?: string | null;
  listingFormat?: string | null;
  tradeMode?: string | null;
  itemOrigin?: string | null;
  packagingState?: string | null;
  subcultureMeta?: SubcultureVerticalMeta | null;
}): SubcultureListingFields {
  return {
    characterName: raw.characterName?.trim() || undefined,
    conditionGrade: (raw.conditionGrade || undefined) as SubcultureConditionGrade | undefined,
    limitedKind: (raw.limitedKind || undefined) as SubcultureLimitedKind | undefined,
    listingFormat: (raw.listingFormat || undefined) as SubcultureListingFormat | undefined,
    tradeMode: (raw.tradeMode || undefined) as SubcultureTradeMode | undefined,
    itemOrigin: (raw.itemOrigin || undefined) as SubcultureItemOrigin | undefined,
    packagingState: (raw.packagingState || undefined) as SubculturePackagingState | undefined,
    subcultureMeta: raw.subcultureMeta ?? undefined,
  };
}
