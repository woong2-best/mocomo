import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  createPromotion,
  listPromotions,
  type CreatePromotionInput,
} from "@/lib/admin/services/promotions";

export const dynamic = "force-dynamic";

function jsonError(e: unknown, fallback = 500) {
  if (e instanceof AdminAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "error" },
    { status: fallback }
  );
}

/** GET /api/admin/promotions */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "admin-promotions-list", 60);
  if (limited) return limited;
  try {
    await requireAdminPermission("coupons");
    const { searchParams } = req.nextUrl;
    const data = await listPromotions({
      q: searchParams.get("q") ?? undefined,
      page: Number(searchParams.get("page") || 1),
      active:
        searchParams.get("active") === "true"
          ? true
          : searchParams.get("active") === "false"
            ? false
            : undefined,
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return jsonError(e);
  }
}

/** POST /api/admin/promotions */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "admin-promotions-create", 20);
  if (limited) return limited;
  try {
    const actor = await requireAdminPermission("coupons.write");
    const body = (await req.json()) as CreatePromotionInput;
    const res = await createPromotion(actor, body);
    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, promotion: res.promotion }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
