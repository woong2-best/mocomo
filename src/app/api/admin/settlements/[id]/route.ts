import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { getSettlementDetail } from "@/lib/admin/services/settlements";

export const dynamic = "force-dynamic";

/** GET /api/admin/settlements/:id */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminPermission("settlements");
    const { id } = await ctx.params;
    const data = await getSettlementDetail(id);
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, settlement: data });
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
