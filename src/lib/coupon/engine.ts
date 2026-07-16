import { calcPlatformFee } from "@/lib/utils";
import { PLATFORM_FEE_RATE } from "@/lib/settlement";

export type FeeCouponSnapshot = {
  assignmentId: string;
  couponId: string;
  benefitType: "FEE_WAIVER" | "FEE_PERCENT_OFF" | "FIXED_AMOUNT";
  remainingBenefitKrw: number | null;
  percentOff: number | null;
  fixedDiscountKrw: number | null;
  maxUsesPerUser: number | null;
  useCount: number;
};

export type FeeSplitResult = {
  platformFee: number;
  sellerAmount: number;
  feeBefore: number;
  benefitAppliedKrw: number;
  waivedGrossKrw: number;
  coupon?: FeeCouponSnapshot;
};

/**
 * 정산 수수료에 쿠폰 혜택 적용.
 * - FEE_WAIVER: remainingBenefitKrw(면제 가능 매출)만큼 0% 수수료, 이후 일반 수수료
 * - FEE_PERCENT_OFF: 수수료에서 percentOff% 할인
 * - FIXED_AMOUNT: 수수료에서 고정액 차감
 */
export function computeFeeWithCoupon(
  grossAmountKrw: number,
  coupon: FeeCouponSnapshot | null | undefined,
  feeRate = PLATFORM_FEE_RATE
): FeeSplitResult {
  const gross = Math.max(0, Math.floor(grossAmountKrw));
  const feeBefore = calcPlatformFee(gross, feeRate);

  if (!coupon || gross <= 0) {
    return {
      platformFee: feeBefore,
      sellerAmount: gross - feeBefore,
      feeBefore,
      benefitAppliedKrw: 0,
      waivedGrossKrw: 0,
    };
  }

  if (coupon.maxUsesPerUser != null && coupon.useCount >= coupon.maxUsesPerUser) {
    return {
      platformFee: feeBefore,
      sellerAmount: gross - feeBefore,
      feeBefore,
      benefitAppliedKrw: 0,
      waivedGrossKrw: 0,
      coupon,
    };
  }

  if (coupon.benefitType === "FEE_WAIVER") {
    const remaining = Math.max(0, coupon.remainingBenefitKrw ?? 0);
    const waivedGross = Math.min(gross, remaining);
    const chargedGross = gross - waivedGross;
    const platformFee = calcPlatformFee(chargedGross, feeRate);
    const benefitAppliedKrw = feeBefore - platformFee;
    return {
      platformFee,
      sellerAmount: gross - platformFee,
      feeBefore,
      benefitAppliedKrw,
      waivedGrossKrw: waivedGross,
      coupon,
    };
  }

  if (coupon.benefitType === "FEE_PERCENT_OFF") {
    const pct = Math.min(100, Math.max(0, coupon.percentOff ?? 0));
    const platformFee = Math.floor((feeBefore * (100 - pct)) / 100);
    return {
      platformFee,
      sellerAmount: gross - platformFee,
      feeBefore,
      benefitAppliedKrw: feeBefore - platformFee,
      waivedGrossKrw: 0,
      coupon,
    };
  }

  // FIXED_AMOUNT
  const cut = Math.min(feeBefore, Math.max(0, coupon.fixedDiscountKrw ?? 0));
  const platformFee = feeBefore - cut;
  return {
    platformFee,
    sellerAmount: gross - platformFee,
    feeBefore,
    benefitAppliedKrw: cut,
    waivedGrossKrw: 0,
    coupon,
  };
}

export function generateCouponCode(length: 8 | 10 | 12 = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function deriveCouponListStatus(coupon: {
  active: boolean;
  endsAt: Date | null;
  maxTotalUses: number | null;
  usedCount: number;
}): "ACTIVE" | "INACTIVE" | "EXPIRED" | "EXHAUSTED" {
  if (!coupon.active) return "INACTIVE";
  if (coupon.endsAt && coupon.endsAt.getTime() < Date.now()) return "EXPIRED";
  if (coupon.maxTotalUses != null && coupon.usedCount >= coupon.maxTotalUses) return "EXHAUSTED";
  return "ACTIVE";
}

export function formatCouponBenefit(coupon: {
  benefitType: string;
  waiveUpToKrw: number | null;
  percentOff: number | null;
  fixedDiscountKrw: number | null;
}): string {
  if (coupon.benefitType === "FEE_WAIVER") {
    return `수수료 면제 (첫 ${(coupon.waiveUpToKrw ?? 0).toLocaleString()}원)`;
  }
  if (coupon.benefitType === "FEE_PERCENT_OFF") {
    return `수수료 ${coupon.percentOff ?? 0}% 할인`;
  }
  return `수수료 ₩${(coupon.fixedDiscountKrw ?? 0).toLocaleString()} 할인`;
}
