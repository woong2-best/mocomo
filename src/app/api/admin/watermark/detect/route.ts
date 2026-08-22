import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi, verifyApiOrigin } from "@/lib/api-security";
import { db } from "@/lib/db";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { readDetectionFrames, runDetectionJob } from "@/lib/watermark/detector/job";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function jsonError(e: unknown) {
  if (e instanceof AdminAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json(
    { error: prismaErrorMessage(e) },
    { status: 500 }
  );
}

/**
 * POST /api/admin/watermark/detect
 *
 * Accepts sampled frames, returns a job id immediately, and finishes analysis
 * after the response is sent. Poll GET /api/admin/watermark/detect/[jobId].
 */
export async function POST(req: NextRequest) {
  if (!verifyApiOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const limited = await rateLimitPublicApi(req, "admin-watermark-detect", 10);
  if (limited) return limited;

  let actor;
  try {
    actor = await requireAdminPermission("reports", {
      action: "WATERMARK_DETECT",
      targetType: "forensic_upload",
    });
  } catch (e) {
    return jsonError(e);
  }

  try {
    const form = await req.formData();
    const parsed = await readDetectionFrames(form);
    const job = await db.watermarkDetectionJob.create({
      data: {
        actorId: actor.id,
        contentId: parsed.contentId,
        sourceKind: parsed.sourceKind,
        clientFileHash: parsed.clientFileHash,
        status: "PENDING",
      },
    });

    const work = runDetectionJob(job.id, {
      buffers: parsed.buffers,
      contentId: parsed.contentId,
      sessionId: parsed.sessionId,
      sourceKind: parsed.sourceKind,
      clientFileHash: parsed.clientFileHash,
      actorId: actor.id,
    });
    after(() => work);

    return NextResponse.json({ ok: true, jobId: job.id, status: "PENDING" }, { status: 202 });
  } catch (e) {
    return jsonError(e);
  }
}
