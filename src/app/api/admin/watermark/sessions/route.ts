import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { db } from "@/lib/db";

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

/** GET /api/admin/watermark/sessions */
export async function GET(req: NextRequest) {
  try {
    await requireAdminPermission("reports");
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const take = 30;
    const skip = (page - 1) * take;

    const [rows, total] = await Promise.all([
      db.watermarkSession.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          contentId: true,
          opaqueWatermarkId: true,
          watermarkVersion: true,
          status: true,
          createdAt: true,
          expiresAt: true,
          detectionCount: true,
          lastDetectedAt: true,
          user: { select: { id: true, username: true } },
        },
      }),
      db.watermarkSession.count(),
    ]);

    return NextResponse.json({ ok: true, rows, total, page });
  } catch (e) {
    return jsonError(e);
  }
}
