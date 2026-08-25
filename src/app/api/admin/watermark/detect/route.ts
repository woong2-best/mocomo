import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi, verifyApiOrigin } from "@/lib/api-security";
import { db } from "@/lib/db";
import { prismaErrorMessage } from "@/lib/prisma-user-error";
import { readDetectionFrames, runDetectionJob } from "@/lib/watermark/detector/job";
import {
  normalizeCreatorUsernameInput,
  resolveCreatorUserId,
} from "@/lib/watermark/detector/creator-scope";
import { normalizeWatermarkSessionIdInput } from "@/lib/watermark/detector/session-id-input";

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
    const sessionId = normalizeWatermarkSessionIdInput(parsed.sessionId);
    const creatorUsername = normalizeCreatorUsernameInput(parsed.creatorUsername);
    let creatorId: string | null = null;
    if (parsed.creatorUsername?.trim()) {
      if (!creatorUsername) {
        return NextResponse.json({ error: "Creator username is invalid" }, { status: 400 });
      }
      creatorId = await resolveCreatorUserId(creatorUsername);
      if (!creatorId) {
        return NextResponse.json({ error: "Creator not found" }, { status: 404 });
      }
    }
    if (!parsed.contentId && !sessionId && !creatorId) {
      return NextResponse.json(
        { error: "Creator username, Media ID, or Session ID is required" },
        { status: 400 }
      );
    }

    const job = await db.watermarkDetectionJob.create({
      data: {
        actorId: actor.id,
        contentId: parsed.contentId,
        sourceKind: parsed.sourceKind,
        clientFileHash: parsed.clientFileHash,
        status: "PENDING",
      },
    });

    after(async () => {
      await runDetectionJob(job.id, {
        buffers: parsed.buffers,
        contentId: parsed.contentId,
        sessionId,
        creatorId,
        sourceKind: parsed.sourceKind,
        clientFileHash: parsed.clientFileHash,
        actorId: actor.id,
      });
    });

    return NextResponse.json({ ok: true, jobId: job.id, status: "PENDING" }, { status: 202 });
  } catch (e) {
    return jsonError(e);
  }
}
