import { NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { resolveWatermarkSession } from "@/lib/watermark/session/service";

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

/** GET /api/admin/watermark/sessions/:id */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminPermission("reports");
    const { id } = await ctx.params;
    const session = await resolveWatermarkSession(id);
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    return jsonError(e);
  }
}
