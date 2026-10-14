import type { Prisma } from "@prisma/client";
import {
  isPhotocardProductType,
  isTcgProductType,
  SUBCULTURE_PRODUCT_TYPES,
} from "@/lib/subculture-commerce/catalog";
import { USED_CATEGORIES, USED_MARKET_BROWSE_CATEGORIES, usedBrowseCategoryWhere } from "@/lib/used-market";

export type UsedQueryFacet = {
  id: string;
  label: string;
  count: number;
};

type TaggedListing = {
  category: string;
  productType?: string | null;
};

/** Collapse case and repeated spaces so "Figures / dolls" matches "figures / dolls". */
export function normalizeUsedQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function labelTokens(label: string): string[] {
  return normalizeUsedQuery(label)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Term is contained in a label token. Short terms must match the whole token. */
export function labelContainsTerm(label: string, term: string): boolean {
  const needle = normalizeUsedQuery(term);
  if (needle.length < 2) return false;
  return labelTokens(label).some((token) =>
    needle.length >= 3 ? token.includes(needle) : token === needle
  );
}

function browseAliases(id: string, label: string): string[] {
  const short = label.split(" / ")[0] ?? label;
  return [label, short, id];
}

/**
 * Stage 1 — the query is exactly a browse category name (full label, chip label, or id).
 * Returns the browse category id, or null.
 */
export function matchUsedBrowseCategory(raw: string): string | null {
  const q = normalizeUsedQuery(raw);
  if (!q) return null;

  for (const category of USED_MARKET_BROWSE_CATEGORIES) {
    const aliases = browseAliases(category.id, category.label).map(normalizeUsedQuery);
    if (aliases.includes(q)) return category.id;
  }

  for (const category of USED_CATEGORIES) {
    if (normalizeUsedQuery(category.label) !== q && category.id.toLowerCase() !== q) continue;
    if (category.id === "COSPLAY" || category.id === "FASHION") return "COSPLAY_FASHION";
    if (USED_MARKET_BROWSE_CATEGORIES.some((browse) => browse.id === category.id)) {
      return category.id;
    }
  }

  return null;
}

/** Browse categories whose name contains the term, excluding an exact category hit. */
export function browseCategoriesForTag(raw: string): string[] {
  if (matchUsedBrowseCategory(raw)) return [];
  return USED_MARKET_BROWSE_CATEGORIES.filter((category) =>
    labelContainsTerm(category.label, raw)
  ).map((category) => category.id);
}

/** Product-type ids whose label or id contains the term. */
export function productTypeIdsForTag(raw: string): string[] {
  const q = normalizeUsedQuery(raw);
  if (q.length < 2) return [];
  return SUBCULTURE_PRODUCT_TYPES.filter(
    (product) => product.id.toLowerCase() === q || labelContainsTerm(product.label, raw)
  ).map((product) => product.id);
}

/** Stage 2 — title, work, character, description, product type, or category tag. */
export function usedListingTextMatchWhere(raw: string): Prisma.UsedListingWhereInput | null {
  const term = raw.trim();
  if (!term) return null;

  const or: Prisma.UsedListingWhereInput[] = [
    { title: { contains: term, mode: "insensitive" } },
    { workTitle: { contains: term, mode: "insensitive" } },
    { characterName: { contains: term, mode: "insensitive" } },
    { description: { contains: term, mode: "insensitive" } },
  ];

  const productIds = productTypeIdsForTag(term);
  if (productIds.length > 0) {
    or.push({ productType: { in: productIds } });
  }

  for (const categoryId of browseCategoriesForTag(term)) {
    const where = usedBrowseCategoryWhere(categoryId);
    if (where) or.push(where);
  }

  return { OR: or };
}

export function listingMatchesBrowseCategory(listing: TaggedListing, categoryId: string): boolean {
  if (categoryId === "TCG") {
    return isTcgProductType(listing.productType) || isPhotocardProductType(listing.productType);
  }
  if (categoryId === "COSPLAY_FASHION") {
    return listing.category === "COSPLAY" || listing.category === "FASHION";
  }
  return listing.category === categoryId;
}

function listingBrowseIds(listing: TaggedListing): string[] {
  const ids = new Set<string>();
  if (isTcgProductType(listing.productType) || isPhotocardProductType(listing.productType)) {
    ids.add("TCG");
  }
  if (listing.category === "COSPLAY" || listing.category === "FASHION") {
    ids.add("COSPLAY_FASHION");
  } else if (USED_MARKET_BROWSE_CATEGORIES.some((category) => category.id === listing.category)) {
    ids.add(listing.category);
  }
  return [...ids];
}

/** Categories the matched products belong to, most common first. */
export function usedQueryFacets(listings: TaggedListing[]): UsedQueryFacet[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    for (const id of listingBrowseIds(listing)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: USED_MARKET_BROWSE_CATEGORIES.find((category) => category.id === id)?.label ?? id,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
