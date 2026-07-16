import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { getPromotionStatistics } from "@/lib/admin/services/promotions";

export const dynamic = "force-dynamic";

/** GET /api/admin/promotions/statistics?promotionId= */
export async function GET(req: NextRequest) {
  try {
    await requireAdminPermission("coupons");
    const id = req.nextUrl.searchParams.get("promotionId") ?? undefined;
    const data = await getPromotionStatistics(id);
    return NextResponse.json({
      ok: true,
      items: data,
      /** 그래프용 시리즈 */
      series: data.map((d) => ({
        id: d.id,
        name: d.name,
        assigned: d.assignedCount,
        used: d.usedCount,
        usageRate: d.usageRate,
        savedKrw: d.usedBenefitKrw,
        avgKrw: d.avgBenefitKrw,
      })),
    });
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
