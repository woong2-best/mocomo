import { NextRequest, NextResponse } from "next/server";
import type { SettlementStatus } from "@prisma/client";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi } from "@/lib/api-security";
import { transitionSettlement } from "@/lib/admin/services/settlements";

export const dynamic = "force-dynamic";

/** POST /api/admin/settlements/:id/transition */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "admin-settlements-transition", 30);
  if (limited) return limited;
  try {
    const actor = await requireAdminPermission("settlements");
    const { id } = await ctx.params;
    const body = (await req.json()) as { toStatus?: SettlementStatus; note?: string };
    if (!body.toStatus) {
      return NextResponse.json({ error: "toStatus required" }, { status: 400 });
    }
    const res = await transitionSettlement(actor, id, body.toStatus, body.note);
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, settlement: res.settlement });
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
