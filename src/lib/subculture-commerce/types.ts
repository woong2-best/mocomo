/** Shared subculture commerce enums — mirrored in Prisma schema. */

export const SUBCULTURE_CONDITION_GRADES = [
  { id: "NEW", label: "미개봉·신품급" },
  { id: "LIKE_NEW", label: "거의 새 것" },
  { id: "NM", label: "NM (Near Mint)" },
  { id: "LP", label: "LP (Light Played)" },
  { id: "MP", label: "MP (Moderate Played)" },
  { id: "HP", label: "HP (Heavy Played)" },
  { id: "POOR", label: "손상·하자 있음" },
  { id: "UNKNOWN", label: "상태 미표기" },
] as const;

export type SubcultureConditionGrade =
  (typeof SUBCULTURE_CONDITION_GRADES)[number]["id"];

export const SUBCULTURE_LIMITED_KINDS = [
  { id: "STANDARD", label: "일반 판매" },
  { id: "EVENT_EXCLUSIVE", label: "행사 한정" },
  { id: "VENUE_ONLY", label: "会場限定·현장 only" },
  { id: "PREORDER", label: "예약·선주문" },
  { id: "COLLAB", label: "콜라보·한정" },
  { id: "LIMITED_RUN", label: "한정 수량" },
  { id: "LOTTERY", label: "추첨·kuji" },
  { id: "PROMO", label: "프로모·特典" },
] as const;

export type SubcultureLimitedKind = (typeof SUBCULTURE_LIMITED_KINDS)[number]["id"];

export const SUBCULTURE_LISTING_FORMATS = [
  { id: "SINGLE", label: "단품" },
  { id: "LOT", label: "Lot·묶음" },
  { id: "SET", label: "세트·풀셋" },
  { id: "BINDER", label: "바인더·앨범" },
  { id: "BOX", label: "박스·팩" },
] as const;

export type SubcultureListingFormat =
  (typeof SUBCULTURE_LISTING_FORMATS)[number]["id"];

export const SUBCULTURE_TRADE_MODES = [
  { id: "SELL", label: "판매만" },
  { id: "TRADE", label: "교환만 (WTT)" },
  { id: "SELL_OR_TRADE", label: "판매·교환" },
] as const;

export type SubcultureTradeMode = (typeof SUBCULTURE_TRADE_MODES)[number]["id"];

export const SUBCULTURE_ITEM_ORIGINS = [
  { id: "OFFICIAL", label: "정품·공식" },
  { id: "FANMADE", label: "팬메·동인·自製" },
  { id: "BOOTLEG_UNKNOWN", label: "출처 불명·짝퉁 의심" },
] as const;

export type SubcultureItemOrigin = (typeof SUBCULTURE_ITEM_ORIGINS)[number]["id"];

export const SUBCULTURE_PACKAGING_STATES = [
  { id: "SEALED", label: "미개봉 (Sealed)" },
  { id: "OPENED_COMPLETE", label: "개봉·구성품 완전" },
  { id: "OPENED_INCOMPLETE", label: "개봉·구성품 일부 없음" },
  { id: "LOOSE", label: "Loose·본체만" },
  { id: "NA", label: "해당 없음" },
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
