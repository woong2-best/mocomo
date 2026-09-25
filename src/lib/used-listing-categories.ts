import type { UsedListingCategory, Prisma } from "@prisma/client";

export const USED_SELL_CATEGORY_IDS = [
  "FIGURE",
  "TCG",
  "GOODS",
  "BOOK",
  "COSPLAY",
  "DIGITAL",
  "FASHION",
] as const;

export type UsedSellCategoryId = (typeof USED_SELL_CATEGORY_IDS)[number];

const ENUM_CATS = new Set<string>([
  "DIGITAL",
  "FIGURE",
  "GOODS",
  "COSPLAY",
  "BOOK",
  "FASHION",
  "OTHER",
]);

export function parseUsedSellCategories(input: unknown, fallback?: string | null) {
  const raw = Array.isArray(input)
    ? input
    : typeof fallback === "string" && fallback.trim()
      ? [fallback]
      : [];
  const unique = [
    ...new Set(
      raw
        .map((v) => (typeof v === "string" ? v.trim().toUpperCase() : ""))
        .filter((v): v is UsedSellCategoryId =>
          (USED_SELL_CATEGORY_IDS as readonly string[]).includes(v)
        )
    ),
  ];
  if (unique.length === 0) {
    return { error: "카테고리를 하나 이상 선택해 주세요." as const };
  }
  const primary = (unique.find((id) => ENUM_CATS.has(id)) ?? "GOODS") as UsedListingCategory;
  return { primary, extra: unique };
}

export function extraCategoriesFromMeta(meta: unknown): string[] {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
  const extra = (meta as { extraCategories?: unknown }).extraCategories;
  return Array.isArray(extra)
    ? extra.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length < 40)
    : [];
}

export function listingCategoryTags(input: {
  category?: string | null;
  productType?: string | null;
  subcultureMeta?: unknown;
}): string[] {
  const tags = new Set<string>();
  if (input.category) tags.add(input.category);
  for (const extra of extraCategoriesFromMeta(input.subcultureMeta)) tags.add(extra);
  if (input.productType?.toUpperCase().startsWith("TCG")) tags.add("TCG");
  return [...tags];
}

export function mergeExtraCategories(
  meta: Prisma.JsonValue | null | undefined,
  extra: string[]
): Prisma.InputJsonValue {
  const base =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? { ...(meta as Record<string, unknown>) }
      : {};
  base.extraCategories = extra;
  return base as Prisma.InputJsonValue;
}
