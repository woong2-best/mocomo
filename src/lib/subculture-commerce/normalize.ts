import { z } from "zod";
import type {
  SubcultureConditionGrade,
  SubcultureItemOrigin,
  SubcultureLimitedKind,
  SubcultureListingFormat,
  SubcultureListingInput,
  SubculturePackagingState,
  SubcultureTradeMode,
  SubcultureVerticalMeta,
} from "@/lib/subculture-commerce/types";
import {
  SUBCULTURE_CONDITION_GRADES,
  SUBCULTURE_ITEM_ORIGINS,
  SUBCULTURE_LIMITED_KINDS,
  SUBCULTURE_LISTING_FORMATS,
  SUBCULTURE_PACKAGING_STATES,
  SUBCULTURE_TRADE_MODES,
} from "@/lib/subculture-commerce/types";

const enumIds = <T extends readonly { id: string }[]>(list: T) =>
  new Set(list.map((x) => x.id));

const CONDITION_IDS = enumIds(SUBCULTURE_CONDITION_GRADES);
const LIMITED_IDS = enumIds(SUBCULTURE_LIMITED_KINDS);
const FORMAT_IDS = enumIds(SUBCULTURE_LISTING_FORMATS);
const TRADE_IDS = enumIds(SUBCULTURE_TRADE_MODES);
const ORIGIN_IDS = enumIds(SUBCULTURE_ITEM_ORIGINS);
const PACKAGING_IDS = enumIds(SUBCULTURE_PACKAGING_STATES);

function pickEnum<T extends string>(
  raw: string | null | undefined,
  allowed: Set<string>
): T | null {
  if (!raw?.trim()) return null;
  const v = raw.trim().toUpperCase();
  return allowed.has(v) ? (v as T) : null;
}

function trimOptional(raw: string | null | undefined, max: number): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export function normalizeAnimeSlug(raw: string | null | undefined): string | null {
  const t = raw?.trim().toLowerCase();
  if (!t) return null;
  return t.replace(/[^a-z0-9_-]/g, "").slice(0, 120) || null;
}

const metaSchema = z
  .object({
    tcgSet: z.string().max(80).optional(),
    tcgNumber: z.string().max(40).optional(),
    tcgRarity: z.string().max(40).optional(),
    tcgLanguage: z.string().max(20).optional(),
    graded: z.boolean().optional(),
    grader: z.string().max(20).optional(),
    grade: z.string().max(20).optional(),
    certNumber: z.string().max(40).optional(),
    album: z.string().max(120).optional(),
    member: z.string().max(80).optional(),
    pcVersion: z.string().max(80).optional(),
    manufacturer: z.string().max(80).optional(),
    scale: z.string().max(40).optional(),
    eventName: z.string().max(120).optional(),
    circleName: z.string().max(80).optional(),
    sizeLabel: z.string().max(40).optional(),
    tradeWants: z.string().max(500).optional(),
    itemCount: z.number().int().min(1).max(9999).optional(),
  })
  .strict();

export function normalizeSubcultureMeta(
  raw: unknown
): SubcultureVerticalMeta | null {
  if (raw == null || typeof raw !== "object") return null;
  const parsed = metaSchema.safeParse(raw);
  if (!parsed.success) return null;
  const entries = Object.entries(parsed.data).filter(
    ([, v]) => v !== undefined && v !== ""
  );
  if (!entries.length) return null;
  return Object.fromEntries(entries) as SubcultureVerticalMeta;
}

export function normalizeSubcultureListingInput(
  input: SubcultureListingInput
): {
  characterName: string | null;
  conditionGrade: SubcultureConditionGrade | null;
  limitedKind: SubcultureLimitedKind | null;
  listingFormat: SubcultureListingFormat | null;
  tradeMode: SubcultureTradeMode;
  itemOrigin: SubcultureItemOrigin | null;
  packagingState: SubculturePackagingState | null;
  subcultureMeta: SubcultureVerticalMeta | null;
  animeSlug: string | null;
} {
  const tradeMode =
    pickEnum<SubcultureTradeMode>(input.tradeMode ?? undefined, TRADE_IDS) ?? "SELL";

  return {
    characterName: trimOptional(input.characterName, 80),
    conditionGrade: pickEnum<SubcultureConditionGrade>(
      input.conditionGrade ?? undefined,
      CONDITION_IDS
    ),
    limitedKind: pickEnum<SubcultureLimitedKind>(
      input.limitedKind ?? undefined,
      LIMITED_IDS
    ),
    listingFormat: pickEnum<SubcultureListingFormat>(
      input.listingFormat ?? undefined,
      FORMAT_IDS
    ),
    tradeMode,
    itemOrigin: pickEnum<SubcultureItemOrigin>(input.itemOrigin ?? undefined, ORIGIN_IDS),
    packagingState: pickEnum<SubculturePackagingState>(
      input.packagingState ?? undefined,
      PACKAGING_IDS
    ),
    subcultureMeta: normalizeSubcultureMeta(input.subcultureMeta),
    animeSlug: normalizeAnimeSlug(input.animeSlug),
  };
}
