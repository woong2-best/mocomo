import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getMyCoupons } from "@/lib/admin/services/coupons";
import { getMyPromotions } from "@/lib/admin/services/promotions";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-coupons-mine", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "notification" });
  if ("error" in auth) return auth.error;

  const [coupons, promotions] = await Promise.all([
    getMyCoupons(auth.user.id),
    getMyPromotions(auth.user.id),
  ]);

  return NextResponse.json({
    coupons: coupons.map((c) => ({
      id: c.id,
      code: c.coupon.code,
      name: c.coupon.name,
      benefitLabel: c.benefitLabel,
      status: c.listStatus,
      remainingBenefitKrw: c.remainingBenefitKrw,
      useCount: c.useCount,
      endsAt: c.coupon.endsAt?.toISOString() ?? null,
    })),
    promotions: promotions.map((p) => ({
      id: p.id,
      name: p.promotion.name,
      benefitLabel: p.benefitLabel,
      status: p.status,
      remainingBenefitKrw: p.remainingBenefitKrw,
    })),
  });
}
