import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  createSettlementDraft,
  listSettlements,
} from "@/lib/admin/services/settlements";
import type { SettlementStatus } from "@prisma/client";

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

/** GET /api/admin/settlements */
export async function GET(req: NextRequest) {
  try {
    await requireAdminPermission("settlements");
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") as SettlementStatus | null;
    const data = await listSettlements({
      status: status || undefined,
      userId: sp.get("userId") ?? undefined,
      page: Number(sp.get("page") || 1),
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return jsonError(e);
  }
}

/** POST /api/admin/settlements — draft 생성 + preview */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "admin-settlements-create", 20);
  if (limited) return limited;
  try {
    const actor = await requireAdminPermission("settlements");
    const body = await req.json();
    if (!body.userId || typeof body.grossAmountKrw !== "number") {
      return NextResponse.json({ error: "userId, grossAmountKrw required" }, { status: 400 });
    }
    const res = await createSettlementDraft({
      userId: body.userId,
      title: body.title,
      grossAmountKrw: body.grossAmountKrw,
      lines: body.lines,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      actorId: actor.id,
    });
    return NextResponse.json(
      { ok: true, settlement: res.settlement, preview: res.preview },
      { status: 201 }
    );
  } catch (e) {
    return jsonError(e);
  }
}
