import { NextResponse } from "next/server";
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

/** GET /api/admin/watermark/detect/[jobId] */
export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const actor = await requireAdminPermission("reports");
    const { jobId } = await ctx.params;
    const job = await db.watermarkDetectionJob.findUnique({
      where: { id: jobId },
    });
    if (!job || job.actorId !== actor.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      jobId: job.id,
      status: job.status,
      error: job.error,
      result: job.result,
    });
  } catch (e) {
    return jsonError(e);
  }
}
