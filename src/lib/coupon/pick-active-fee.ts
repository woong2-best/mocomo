import { db } from "@/lib/db";
import type { FeeCouponSnapshot } from "@/lib/coupon/engine";

/** 정산 시 적용할 활성 쿠폰 선택 (면제 잔여 우선) — promotions↔coupons 순환 참조 방지 */
export async function pickActiveFeeCouponForUser(
  userId: string
): Promise<FeeCouponSnapshot | null> {
  const now = new Date();
  const rows = await db.couponAssignment.findMany({
    where: {
      userId,
      status: "ACTIVE",
      coupon: {
        active: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
    },
    include: { coupon: true },
    orderBy: { assignedAt: "asc" },
  });

  for (const a of rows) {
    const c = a.coupon;
    if (c.maxTotalUses != null && c.usedCount >= c.maxTotalUses) continue;
    if (c.maxUsesPerUser != null && a.useCount >= c.maxUsesPerUser) continue;
    if (c.benefitType === "FEE_WAIVER" && (a.remainingBenefitKrw ?? 0) <= 0) continue;
    return {
      assignmentId: a.id,
      couponId: c.id,
      benefitType: c.benefitType,
      remainingBenefitKrw: a.remainingBenefitKrw,
      percentOff: c.percentOff,
      fixedDiscountKrw: c.fixedDiscountKrw,
      maxUsesPerUser: c.maxUsesPerUser,
      useCount: a.useCount,
    };
  }
  return null;
}
