import { cn } from "@/lib/utils";
import type { SubcultureBadge } from "@/lib/subculture-commerce/labels";
import {
  buildSubcultureBadges,
  formatSubcultureMetaSummary,
} from "@/lib/subculture-commerce/labels";
import type { SubcultureVerticalMeta } from "@/lib/subculture-commerce/types";
import { normalizeSubcultureMeta } from "@/lib/subculture-commerce/normalize";

const toneClass: Record<NonNullable<SubcultureBadge["tone"]>, string> = {
  accent: "border-folk-terracotta/40 bg-folk-terracotta/10 text-folk-terracotta",
  trade: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  muted: "border-border/60 bg-muted/40 text-muted-foreground",
};

export function SubcultureMetaBadges({
  productType,
  characterName,
  conditionGrade,
  limitedKind,
  listingFormat,
  tradeMode,
  itemOrigin,
  packagingState,
  subcultureMeta,
  className,
  max = 6,
}: {
  productType?: string | null;
  characterName?: string | null;
  conditionGrade?: string | null;
  limitedKind?: string | null;
  listingFormat?: string | null;
  tradeMode?: string | null;
  itemOrigin?: string | null;
  packagingState?: string | null;
  subcultureMeta?: SubcultureVerticalMeta | null;
  className?: string;
  max?: number;
}) {
  const badges = buildSubcultureBadges({
    productType,
    characterName,
    conditionGrade,
    limitedKind,
    listingFormat,
    tradeMode,
    itemOrigin,
    packagingState,
    subcultureMeta,
  }).slice(0, max);

  if (!badges.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {badges.map((b) => (
        <span
          key={b.key}
          className={cn(
            "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-tight",
            toneClass[b.tone ?? "muted"]
          )}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

export function parseSubcultureMetaFromDb(raw: unknown): SubcultureVerticalMeta | null {
  return normalizeSubcultureMeta(raw);
}

export function SubcultureMetaDetail({
  subcultureMeta,
  className,
}: {
  subcultureMeta?: SubcultureVerticalMeta | null;
  className?: string;
}) {
  const lines = formatSubcultureMetaSummary(subcultureMeta);
  if (!lines.length) return null;
  return (
    <ul className={cn("text-xs text-muted-foreground space-y-0.5", className)}>
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
