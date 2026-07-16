import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { listPromotionHistory } from "@/lib/admin/services/promotions";

export const dynamic = "force-dynamic";

/** GET /api/admin/promotions/history?promotionId=&page= */
export async function GET(req: NextRequest) {
  try {
    await requireAdminPermission("coupons");
    const sp = req.nextUrl.searchParams;
    const data = await listPromotionHistory(
      sp.get("promotionId") ?? undefined,
      Number(sp.get("page") || 1)
    );
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
