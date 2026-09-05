import type { SubcultureVerticalMeta } from "@/lib/subculture-commerce/types";
import {
  SUBCULTURE_CONDITION_GRADES,
  SUBCULTURE_ITEM_ORIGINS,
  SUBCULTURE_LIMITED_KINDS,
  SUBCULTURE_LISTING_FORMATS,
  SUBCULTURE_PACKAGING_STATES,
  SUBCULTURE_TRADE_MODES,
} from "@/lib/subculture-commerce/types";
import { subcultureProductTypeLabel } from "@/lib/subculture-commerce/catalog";

function labelFrom<T extends { id: string; label: string }>(
  list: readonly T[],
  id: string | null | undefined
): string {
  if (!id) return "";
  return list.find((x) => x.id === id)?.label ?? "";
}

export function conditionGradeLabel(id: string | null | undefined) {
  return labelFrom(SUBCULTURE_CONDITION_GRADES, id);
}

export function limitedKindLabel(id: string | null | undefined) {
  return labelFrom(SUBCULTURE_LIMITED_KINDS, id);
}

export function listingFormatLabel(id: string | null | undefined) {
  return labelFrom(SUBCULTURE_LISTING_FORMATS, id);
}

export function tradeModeLabel(id: string | null | undefined) {
  return labelFrom(SUBCULTURE_TRADE_MODES, id);
}

export function itemOriginLabel(id: string | null | undefined) {
  return labelFrom(SUBCULTURE_ITEM_ORIGINS, id);
}

export function packagingStateLabel(id: string | null | undefined) {
  return labelFrom(SUBCULTURE_PACKAGING_STATES, id);
}

export type SubcultureBadge = { key: string; label: string; tone?: "accent" | "muted" | "trade" };

export function buildSubcultureBadges(input: {
  productType?: string | null;
  characterName?: string | null;
  conditionGrade?: string | null;
  limitedKind?: string | null;
  listingFormat?: string | null;
  tradeMode?: string | null;
  itemOrigin?: string | null;
  packagingState?: string | null;
  subcultureMeta?: SubcultureVerticalMeta | null;
}): SubcultureBadge[] {
  const badges: SubcultureBadge[] = [];

  const productLabel = subcultureProductTypeLabel(input.productType);
  if (productLabel) badges.push({ key: "product", label: productLabel, tone: "accent" });

  if (input.tradeMode === "TRADE") {
    badges.push({ key: "trade", label: "교환 (WTT)", tone: "trade" });
  } else if (input.tradeMode === "SELL_OR_TRADE") {
    badges.push({ key: "trade", label: "판매·교환", tone: "trade" });
  }

  const limited = limitedKindLabel(input.limitedKind);
  if (limited && input.limitedKind !== "STANDARD") {
    badges.push({ key: "limited", label: limited, tone: "accent" });
  }

  const fmt = listingFormatLabel(input.listingFormat);
  if (fmt && input.listingFormat !== "SINGLE") {
    badges.push({ key: "format", label: fmt });
  }

  const cond = conditionGradeLabel(input.conditionGrade);
  if (cond && input.conditionGrade !== "UNKNOWN") {
    badges.push({ key: "condition", label: cond });
  }

  const pack = packagingStateLabel(input.packagingState);
  if (pack && input.packagingState !== "NA") {
    badges.push({ key: "packaging", label: pack });
  }

  const origin = itemOriginLabel(input.itemOrigin);
  if (origin && input.itemOrigin !== "OFFICIAL") {
    badges.push({ key: "origin", label: origin, tone: "muted" });
  } else if (input.itemOrigin === "OFFICIAL") {
    badges.push({ key: "origin", label: "정품", tone: "muted" });
  }

  if (input.characterName?.trim()) {
    badges.push({ key: "character", label: input.characterName.trim() });
  }

  const meta = input.subcultureMeta;
  if (meta?.graded && meta.grader) {
    badges.push({
      key: "grade",
      label: `${meta.grader} ${meta.grade ?? ""}`.trim(),
      tone: "accent",
    });
  }
  if (meta?.tcgSet) {
    badges.push({ key: "tcgSet", label: meta.tcgSet });
  }
  if (meta?.album) {
    badges.push({ key: "album", label: meta.album });
  }
  if (meta?.eventName) {
    badges.push({ key: "event", label: meta.eventName });
  }

  return badges;
}

export function formatSubcultureMetaSummary(
  meta: SubcultureVerticalMeta | null | undefined
): string[] {
  if (!meta) return [];
  const lines: string[] = [];
  if (meta.tcgSet || meta.tcgNumber) {
    lines.push([meta.tcgSet, meta.tcgNumber].filter(Boolean).join(" · "));
  }
  if (meta.tcgRarity) lines.push(`레어도: ${meta.tcgRarity}`);
  if (meta.tcgLanguage) lines.push(`언어: ${meta.tcgLanguage}`);
  if (meta.member) lines.push(`멤버: ${meta.member}`);
  if (meta.pcVersion) lines.push(`버전: ${meta.pcVersion}`);
  if (meta.manufacturer) lines.push(`제조사: ${meta.manufacturer}`);
  if (meta.scale) lines.push(`스케일: ${meta.scale}`);
  if (meta.circleName) lines.push(`서클: ${meta.circleName}`);
  if (meta.sizeLabel) lines.push(`사이즈: ${meta.sizeLabel}`);
  if (meta.itemCount != null) lines.push(`수량: ${meta.itemCount}개`);
  if (meta.tradeWants) lines.push(`교환 희망: ${meta.tradeWants}`);
  if (meta.graded && meta.certNumber) lines.push(`인증번호: ${meta.certNumber}`);
  return lines;
}
