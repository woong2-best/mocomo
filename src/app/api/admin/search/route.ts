import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { getAdminSearchStatistics } from "@/lib/search/admin-stats";
import { recomputeSearchTrends } from "@/lib/search/trends";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminPermission("statistics");
    const mode = req.nextUrl.searchParams.get("mode");
    if (mode === "recompute") {
      const result = await recomputeSearchTrends(100);
      return NextResponse.json({ ok: true, recompute: result });
    }
    const data = await getAdminSearchStatistics();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.status }
      );
    }
    console.error("[api/admin/search]", e);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
