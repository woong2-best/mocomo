import { db } from "@/lib/db";
import { formatCouponBenefit } from "@/lib/coupon/engine";

async function appendRedeemHistory(couponId: string, userId: string) {
  await db.couponHistory.create({
    data: {
      couponId,
      actorId: userId,
      action: "REDEEM",
      detail: `user=${userId}`,
    },
  });
}

/** 사용자가 코드 입력으로 쿠폰 수령 — API 경량 import (admin/services/coupons 순환 참조 방지) */
export async function redeemCouponCode(userId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < 4) return { error: "유효하지 않은 코드입니다." };

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) return { error: "쿠폰을 찾을 수 없습니다." };
  if (coupon.endsAt && coupon.endsAt.getTime() < Date.now()) {
    return { error: "만료된 쿠폰입니다." };
  }
  if (coupon.maxTotalUses != null && coupon.usedCount >= coupon.maxTotalUses) {
    return { error: "지급 한도가 소진된 쿠폰입니다." };
  }

  try {
    const assignment = await db.couponAssignment.create({
      data: {
        couponId: coupon.id,
        userId,
        remainingBenefitKrw:
          coupon.benefitType === "FEE_WAIVER" ? coupon.waiveUpToKrw ?? 0 : null,
        status: "ACTIVE",
      },
    });
    await db.coupon.update({
      where: { id: coupon.id },
      data: { assignedCount: { increment: 1 } },
    });
    await appendRedeemHistory(coupon.id, userId);
    const { createNotification } = await import("@/lib/notifications");
    await createNotification({
      userId,
      type: "COUPON",
      title: `쿠폰 등록: ${coupon.name}`,
      body: formatCouponBenefit(coupon),
      link: "/coupons",
    });
    return { success: true as const, assignment };
  } catch {
    return { error: "이미 등록한 쿠폰입니다." };
  }
}
