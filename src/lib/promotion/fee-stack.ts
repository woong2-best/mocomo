import { calcPlatformFee } from "@/lib/utils";
import { PLATFORM_FEE_RATE } from "@/lib/settlement";
import type { FeeCouponSnapshot, FeeSplitResult } from "@/lib/coupon/engine";
import { computeFeeWithCoupon } from "@/lib/coupon/engine";

export type FeePromotionSnapshot = {
  kind: "promotion";
  assignmentId: string;
  promotionId: string;
  name: string;
  priority: number;
  stackable: boolean;
  allowDuplicate: boolean;
  maxStackPerSettlement: number;
  benefitType: "FEE_WAIVER" | "FEE_PERCENT_OFF" | "FIXED_AMOUNT";
  remainingBenefitKrw: number | null;
  percentOff: number | null;
  fixedDiscountKrw: number | null;
  maxUsesPerUser: number | null;
  useCount: number;
};

export type UnifiedFeePreview = {
  grossAmountKrw: number;
  feeBeforeKrw: number;
  feeAfterKrw: number;
  sellerAmountKrw: number;
  discountAmountKrw: number;
  /** 호환: 첫 번째 적용 Promotion */
  appliedPromotion: FeePromotionSnapshot | null;
  appliedPromotions: FeePromotionSnapshot[];
  appliedCoupon: FeeCouponSnapshot | null;
  steps: { label: string; feeBefore: number; feeAfter: number; saved: number }[];
};

/** 우선순위·스택 규칙에 따라 적용할 Promotion 목록 선정 */
export function selectPromotionsForStack(
  candidates: FeePromotionSnapshot[],
  globalMaxStack = 10
): FeePromotionSnapshot[] {
  const sorted = [...candidates].sort(
    (a, b) => a.priority - b.priority || a.name.localeCompare(b.name)
  );
  const selected: FeePromotionSnapshot[] = [];
  const seenPromotionIds = new Set<string>();

  for (const p of sorted) {
    if (selected.length >= globalMaxStack) break;
    if (!p.allowDuplicate && seenPromotionIds.has(p.promotionId)) continue;

    if (selected.length === 0) {
      selected.push(p);
      seenPromotionIds.add(p.promotionId);
      continue;
    }

    // 이미 선택된 항목이 전부 non-stackable이면 추가 불가 (최우선만)
    const head = selected[0];
    if (!head.stackable && !p.stackable) {
      // 둘 다 단독형 → 이미 더 높은 우선순위가 있음
      continue;
    }
    if (!p.stackable) {
      // 단독형은 스택 중이 아닐 때만 (이미 있으면 스킵)
      continue;
    }
    if (!head.stackable) {
      // head가 단독형이면 스택 불가
      continue;
    }

    const maxAllowed = Math.min(
      globalMaxStack,
      ...selected.map((s) => s.maxStackPerSettlement || 1),
      p.maxStackPerSettlement || 1
    );
    if (selected.length >= maxAllowed) continue;

    selected.push(p);
    seenPromotionIds.add(p.promotionId);
  }

  return selected;
}

function applyOnePromotion(
  gross: number,
  currentFee: number,
  promo: FeePromotionSnapshot,
  feeRate: number
): { feeAfter: number; saved: number } {
  const asCoupon: FeeCouponSnapshot = {
    assignmentId: promo.assignmentId,
    couponId: promo.promotionId,
    benefitType: promo.benefitType,
    remainingBenefitKrw: promo.remainingBenefitKrw,
    percentOff: promo.percentOff,
    fixedDiscountKrw: promo.fixedDiscountKrw,
    maxUsesPerUser: promo.maxUsesPerUser,
    useCount: promo.useCount,
  };

  if (promo.benefitType === "FEE_WAIVER") {
    const r = computeFeeWithCoupon(gross, asCoupon, feeRate);
    // 스택 시 잔여 수수료에서만 추가 절감
    const feeAfter = Math.min(currentFee, r.platformFee);
    return { feeAfter, saved: Math.max(0, currentFee - feeAfter) };
  }
  if (promo.benefitType === "FEE_PERCENT_OFF") {
    const pct = Math.min(100, Math.max(0, promo.percentOff ?? 0));
    const next = Math.floor((currentFee * (100 - pct)) / 100);
    return { feeAfter: next, saved: Math.max(0, currentFee - next) };
  }
  const next = Math.max(0, currentFee - Math.max(0, promo.fixedDiscountKrw ?? 0));
  return { feeAfter: next, saved: Math.max(0, currentFee - next) };
}

/**
 * Promotion 스택(priority) → Coupon.
 * promotions[] 또는 단일 promotion 모두 지원.
 */
export function previewFeeWithBenefits(input: {
  grossAmountKrw: number;
  promotion?: FeePromotionSnapshot | null;
  promotions?: FeePromotionSnapshot[];
  coupon: FeeCouponSnapshot | null;
  feeRate?: number;
  globalMaxStack?: number;
}): UnifiedFeePreview {
  const feeRate = input.feeRate ?? PLATFORM_FEE_RATE;
  const gross = Math.max(0, Math.floor(input.grossAmountKrw));
  const feeBefore = calcPlatformFee(gross, feeRate);
  const steps: UnifiedFeePreview["steps"] = [];

  const candidates =
    input.promotions && input.promotions.length > 0
      ? input.promotions
      : input.promotion
        ? [input.promotion]
        : [];

  const stacked = selectPromotionsForStack(candidates, input.globalMaxStack ?? 10);
  let currentFee = feeBefore;
  const appliedPromotions: FeePromotionSnapshot[] = [];

  for (const p of stacked) {
    const { feeAfter, saved } = applyOnePromotion(gross, currentFee, p, feeRate);
    if (saved > 0) {
      steps.push({
        label: `Promotion: ${p.name}`,
        feeBefore: currentFee,
        feeAfter,
        saved,
      });
      currentFee = feeAfter;
      appliedPromotions.push(p);
    }
  }

  let appliedCoupon: FeeCouponSnapshot | null = null;
  if (input.coupon) {
    if (input.coupon.benefitType === "FEE_WAIVER") {
      const r = computeFeeWithCoupon(gross, input.coupon, feeRate);
      if (appliedPromotions.length === 0 && r.benefitAppliedKrw > 0) {
        steps.push({
          label: "Coupon",
          feeBefore: currentFee,
          feeAfter: r.platformFee,
          saved: r.benefitAppliedKrw,
        });
        currentFee = r.platformFee;
        appliedCoupon = input.coupon;
      } else if (r.platformFee < currentFee) {
        const saved = currentFee - r.platformFee;
        steps.push({ label: "Coupon", feeBefore: currentFee, feeAfter: r.platformFee, saved });
        currentFee = r.platformFee;
        appliedCoupon = input.coupon;
      }
    } else {
      const pct =
        input.coupon.benefitType === "FEE_PERCENT_OFF"
          ? Math.min(100, Math.max(0, input.coupon.percentOff ?? 0))
          : 0;
      let next = currentFee;
      if (input.coupon.benefitType === "FEE_PERCENT_OFF") {
        next = Math.floor((currentFee * (100 - pct)) / 100);
      } else {
        next = Math.max(0, currentFee - Math.max(0, input.coupon.fixedDiscountKrw ?? 0));
      }
      const saved = currentFee - next;
      if (saved > 0) {
        steps.push({ label: "Coupon", feeBefore: currentFee, feeAfter: next, saved });
        currentFee = next;
        appliedCoupon = input.coupon;
      }
    }
  }

  return {
    grossAmountKrw: gross,
    feeBeforeKrw: feeBefore,
    feeAfterKrw: currentFee,
    sellerAmountKrw: gross - currentFee,
    discountAmountKrw: feeBefore - currentFee,
    appliedPromotion: appliedPromotions[0] ?? null,
    appliedPromotions,
    appliedCoupon,
    steps,
  };
}

export type { FeeSplitResult };
