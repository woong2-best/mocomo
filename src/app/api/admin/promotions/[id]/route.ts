import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  deletePromotion,
  getPromotionDetail,
  updatePromotion,
} from "@/lib/admin/services/promotions";

export const dynamic = "force-dynamic";

function jsonError(e: unknown) {
  if (e instanceof AdminAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "error" },
    { status: 500 }
  );
}

/** GET /api/admin/promotions/:id */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminPermission("coupons");
    const { id } = await ctx.params;
    const data = await getPromotionDetail(id);
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, promotion: data });
  } catch (e) {
    return jsonError(e);
  }
}

/** PATCH /api/admin/promotions/:id */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "admin-promotions-patch", 30);
  if (limited) return limited;
  try {
    const actor = await requireAdminPermission("coupons.write");
    const { id } = await ctx.params;
    const body = await req.json();
    const res = await updatePromotion(actor, id, body);
    return NextResponse.json({ ok: true, promotion: res.promotion });
  } catch (e) {
    return jsonError(e);
  }
}

/** DELETE /api/admin/promotions/:id */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "admin-promotions-delete", 20);
  if (limited) return limited;
  try {
    const actor = await requireAdminPermission("coupons.delete");
    const { id } = await ctx.params;
    await deletePromotion(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
