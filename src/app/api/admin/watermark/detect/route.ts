import { NextRequest, NextResponse } from "next/server";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi, verifyApiOrigin } from "@/lib/api-security";
import { validateBufferMime } from "@/lib/file-magic";
import { hashFileSha256 } from "@/lib/watermark/crypto/secrets";
import { formatDetectionMessage } from "@/lib/watermark/decoder/confidence";
import { decodeImageToFrame, detectWatermarkInFrames } from "@/lib/watermark/decoder/pipeline";
import {
  loadDetectionCandidates,
  recordDetectionHit,
  resolveWatermarkSession,
} from "@/lib/watermark/session/service";
import type { AdminWatermarkDetectionResponse } from "@/lib/watermark/types";

export const dynamic = "force-dynamic";

const MAX_FRAME_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
const MAX_FRAMES = 24;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

function jsonError(e: unknown) {
  if (e instanceof AdminAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "error" },
    { status: 500 }
  );
}

async function enrichDetectionResult(
  base: Awaited<ReturnType<typeof detectWatermarkInFrames>>
): Promise<AdminWatermarkDetectionResponse> {
  const message = formatDetectionMessage(base.status);
  const analysisLog = {
    framesAnalyzed: base.framesAnalyzed,
    candidateFrames: base.candidateFrames,
  };

  if (!base.sessionId || base.status !== "MATCH") {
    return {
      ...base,
      message,
      session: null,
      content: null,
      purchase: null,
      member: null,
      analysisLog,
    };
  }

  const session = await resolveWatermarkSession(base.sessionId);
  if (!session) {
    return {
      ...base,
      message,
      session: null,
      content: null,
      purchase: null,
      member: null,
      analysisLog,
    };
  }

  await recordDetectionHit(session.id);

  return {
    ...base,
    message,
    session: {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      opaqueWatermarkId: session.opaqueWatermarkId,
    },
    content: {
      id: session.contentId,
      title: session.media.post.title,
      authorUsername: session.media.post.author.username,
    },
    purchase: {
      id: session.purchase.id,
      price: session.purchase.price,
      createdAt: session.purchase.createdAt.toISOString(),
    },
    member: {
      id: session.user.id,
      username: session.user.username,
    },
    analysisLog,
  };
}

/**
 * POST /api/admin/watermark/detect — forensic analysis of a leaked capture.
 *
 * Takes still frames rather than a video file: there is no ffmpeg in this
 * runtime, so the admin client decodes the video and submits sampled frames.
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
    const uploads = form.getAll("frames").filter((f): f is File => f instanceof File);
    if (!uploads.length) {
      return NextResponse.json({ error: "At least one frame is required" }, { status: 400 });
    }
    if (uploads.length > MAX_FRAMES) {
      return NextResponse.json({ error: `At most ${MAX_FRAMES} frames` }, { status: 400 });
    }

    const contentId = (form.get("contentId") as string | null)?.trim() || null;
    const sourceKind = (form.get("sourceKind") as string | null)?.trim() || "image";
    const clientFileHash = (form.get("clientFileHash") as string | null)?.trim() || null;

    const buffers: Buffer[] = [];
    let totalBytes = 0;
    for (const upload of uploads) {
      if (upload.size <= 0 || upload.size > MAX_FRAME_BYTES) {
        return NextResponse.json({ error: "Invalid frame size" }, { status: 400 });
      }
      totalBytes += upload.size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        return NextResponse.json({ error: "Upload too large" }, { status: 400 });
      }
      const buf = Buffer.from(await upload.arrayBuffer());
      if (!validateBufferMime(buf, upload.type || "image/png", ALLOWED_MIMES)) {
        return NextResponse.json({ error: "Unsupported frame type" }, { status: 400 });
      }
      buffers.push(buf);
    }

    // Hash what was actually analysed so the audit trail matches the evidence.
    const sourceFileHash = hashFileSha256(Buffer.concat(buffers));

    const candidates = await loadDetectionCandidates({ contentId });
    if (!candidates.length) {
      return NextResponse.json(
        {
          error: contentId
            ? "No watermark sessions recorded for this content"
            : "No watermark sessions recorded yet",
        },
        { status: 404 }
      );
    }

    const frames = await Promise.all(buffers.map(decodeImageToFrame));
    const detection = detectWatermarkInFrames(frames, candidates);
    const enriched = await enrichDetectionResult(detection);

    const { db } = await import("@/lib/db");
    await db.watermarkDetectionLog.create({
      data: {
        watermarkSessionId: enriched.sessionId,
        contentId: enriched.contentId ?? contentId,
        detectionType: sourceKind === "video" ? "video" : "image",
        confidence: enriched.confidence,
        detectedRegions: enriched.detectedRegions,
        sourceFileHash,
        resultStatus: enriched.status,
        actorId: actor.id,
        metadata: {
          integrityValid: enriched.integrityValid,
          eccValid: enriched.eccValid,
          centralScore: enriched.centralScore,
          distributedScore: enriched.distributedScore,
          temporalMatches: enriched.temporalMatches,
          framesAnalyzed: enriched.analysisLog?.framesAnalyzed,
          candidateFrames: enriched.analysisLog?.candidateFrames,
          candidatesSearched: candidates.length,
          scopedToContentId: contentId,
          clientReportedFileHash: clientFileHash,
        },
      },
    });

    return NextResponse.json({ ok: true, ...enriched });
  } catch (e) {
    return jsonError(e);
  }
}
