import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { previewUserSettlementBenefits } from "@/lib/admin/services/promotions";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";

export const dynamic = "force-dynamic";

/**
 * POST /api/coupons/preview
 * body: { grossAmountKrw, userId? } — userId는 관리자만
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "coupons-preview", 40);
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await req.json()) as { grossAmountKrw?: number; userId?: string };
    const gross = Math.floor(Number(body.grossAmountKrw) || 0);
    if (gross <= 0) {
      return NextResponse.json({ error: "grossAmountKrw required" }, { status: 400 });
    }

    let userId = session.user.id;
    if (body.userId && body.userId !== session.user.id) {
      await requireAdminPermission("settlements");
      userId = body.userId;
    }

    const preview = await previewUserSettlementBenefits(userId, gross);
    return NextResponse.json({
      ok: true,
      preview: {
        grossAmountKrw: preview.grossAmountKrw,
        feeBeforeKrw: preview.feeBeforeKrw,
        feeAfterKrw: preview.feeAfterKrw,
        discountAmountKrw: preview.discountAmountKrw,
        sellerAmountKrw: preview.sellerAmountKrw,
        appliedPromotion: preview.appliedPromotion
          ? {
              id: preview.appliedPromotion.promotionId,
              name: preview.appliedPromotion.name,
              priority: preview.appliedPromotion.priority,
            }
          : null,
        appliedCoupon: preview.appliedCoupon
          ? { id: preview.appliedCoupon.couponId, assignmentId: preview.appliedCoupon.assignmentId }
          : null,
        steps: preview.steps,
      },
    });
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
