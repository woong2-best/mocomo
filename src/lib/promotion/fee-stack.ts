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
  appliedPromotion: FeePromotionSnapshot | null;
  appliedCoupon: FeeCouponSnapshot | null;
  steps: { label: string; feeBefore: number; feeAfter: number; saved: number }[];
};

/**
 * 정산 수수료: Promotion(우선순위) → Coupon 순으로 적용.
 * 기존 Coupon 엔진과 호환.
 */
export function previewFeeWithBenefits(input: {
  grossAmountKrw: number;
  promotion: FeePromotionSnapshot | null;
  coupon: FeeCouponSnapshot | null;
  feeRate?: number;
}): UnifiedFeePreview {
  const feeRate = input.feeRate ?? PLATFORM_FEE_RATE;
  const gross = Math.max(0, Math.floor(input.grossAmountKrw));
  const feeBefore = calcPlatformFee(gross, feeRate);
  const steps: UnifiedFeePreview["steps"] = [];

  let currentFee = feeBefore;
  let appliedPromotion: FeePromotionSnapshot | null = null;
  let appliedCoupon: FeeCouponSnapshot | null = null;

  if (input.promotion) {
    const asCoupon: FeeCouponSnapshot = {
      assignmentId: input.promotion.assignmentId,
      couponId: input.promotion.promotionId,
      benefitType: input.promotion.benefitType,
      remainingBenefitKrw: input.promotion.remainingBenefitKrw,
      percentOff: input.promotion.percentOff,
      fixedDiscountKrw: input.promotion.fixedDiscountKrw,
      maxUsesPerUser: input.promotion.maxUsesPerUser,
      useCount: input.promotion.useCount,
    };
    const r = computeFeeWithCoupon(gross, asCoupon, feeRate);
    if (r.benefitAppliedKrw > 0) {
      steps.push({
        label: `Promotion: ${input.promotion.name}`,
        feeBefore: currentFee,
        feeAfter: r.platformFee,
        saved: r.benefitAppliedKrw,
      });
      currentFee = r.platformFee;
      appliedPromotion = input.promotion;
    }
  }

  // 쿠폰은 남은 수수료에 대해 비율/고정을 적용 — 면제인 경우 남은 gross 기반으로 재계산
  if (input.coupon) {
    if (input.coupon.benefitType === "FEE_WAIVER") {
      // 이미 promotion이 일부 면제했다면 remaining만 쿠폰에 사용
      const r = computeFeeWithCoupon(gross, input.coupon, feeRate);
      // 간단화: 최종 수수료는 두 결과 중 더 낮은 쪽을 택하지 않고, promotion 적용 후 잔여 수수료에서 쿠폰 고정/%만 적용
      if (!appliedPromotion) {
        if (r.benefitAppliedKrw > 0) {
          steps.push({
            label: "Coupon",
            feeBefore: currentFee,
            feeAfter: r.platformFee,
            saved: r.benefitAppliedKrw,
          });
          currentFee = r.platformFee;
          appliedCoupon = input.coupon;
        }
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
    appliedPromotion,
    appliedCoupon,
    steps,
  };
}

export type { FeeSplitResult };
