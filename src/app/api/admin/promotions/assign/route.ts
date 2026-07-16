import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi } from "@/lib/api-security";
import { assignPromotion } from "@/lib/admin/services/promotions";

export const dynamic = "force-dynamic";

/** POST /api/admin/promotions/assign */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "admin-promotions-assign", 20);
  if (limited) return limited;
  try {
    const actor = await requireAdminPermission("coupons.assign");
    const body = (await req.json()) as {
      promotionId?: string;
      userIds?: string[];
      skipRules?: boolean;
    };
    if (!body.promotionId || !Array.isArray(body.userIds) || body.userIds.length === 0) {
      return NextResponse.json({ error: "promotionId, userIds required" }, { status: 400 });
    }
    const res = await assignPromotion(actor, body.promotionId, body.userIds, {
      skipRules: body.skipRules ?? true,
      notify: true,
    });
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, created: res.created, skipped: res.skipped });
  } catch (e) {
    if (e instanceof AdminAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
