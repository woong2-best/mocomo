import { db } from "@/lib/db";
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

const MAX_FRAME_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
export const MAX_DETECT_FRAMES = 24;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

export async function enrichDetectionResult(
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

  const purchaseRow = session.purchase ?? session.episodePurchase;
  const contentTitle = session.media?.post.title ?? session.episode?.title ?? null;
  const authorUsername =
    session.media?.post.author.username ?? session.episode?.author.username ?? "";

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
      title: contentTitle,
      authorUsername,
    },
    purchase: purchaseRow
      ? {
          id: purchaseRow.id,
          price: purchaseRow.price,
          createdAt: purchaseRow.createdAt.toISOString(),
        }
      : null,
    subscriptionId: session.subscriptionId,
    member: {
      id: session.user.id,
      username: session.user.username,
    },
    analysisLog,
  };
}

export async function readDetectionFrames(form: FormData): Promise<{
  buffers: Buffer[];
  contentId: string | null;
  sessionId: string | null;
  sourceKind: string;
  clientFileHash: string | null;
}> {
  const uploads = form.getAll("frames").filter((f): f is File => f instanceof File);
  if (!uploads.length) throw new Error("At least one frame is required");
  if (uploads.length > MAX_DETECT_FRAMES) {
    throw new Error(`At most ${MAX_DETECT_FRAMES} frames`);
  }

  const contentId = (form.get("contentId") as string | null)?.trim() || null;
  const sessionId = (form.get("sessionId") as string | null)?.trim() || null;
  const sourceKind = (form.get("sourceKind") as string | null)?.trim() || "image";
  const clientFileHash = (form.get("clientFileHash") as string | null)?.trim() || null;

  const buffers: Buffer[] = [];
  let totalBytes = 0;
  for (const upload of uploads) {
    if (upload.size <= 0 || upload.size > MAX_FRAME_BYTES) {
      throw new Error("Invalid frame size");
    }
    totalBytes += upload.size;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("Upload too large");
    const buf = Buffer.from(await upload.arrayBuffer());
    if (!validateBufferMime(buf, upload.type || "image/png", ALLOWED_MIMES)) {
      throw new Error("Unsupported frame type");
    }
    buffers.push(buf);
  }

  return { buffers, contentId, sessionId, sourceKind, clientFileHash };
}

export async function runDetectionJob(jobId: string, input: {
  buffers: Buffer[];
  contentId: string | null;
  sessionId: string | null;
  sourceKind: string;
  clientFileHash: string | null;
  actorId: string;
}) {
  await db.watermarkDetectionJob.update({
    where: { id: jobId },
    data: { status: "RUNNING" },
  });

  try {
    const sourceFileHash = hashFileSha256(Buffer.concat(input.buffers));
    const candidates = await loadDetectionCandidates({
      contentId: input.contentId,
      sessionId: input.sessionId,
    });
    if (!candidates.length) {
      throw new Error(
        input.contentId
          ? "No watermark sessions recorded for this content"
          : "No watermark sessions recorded yet"
      );
    }

    const frames = await Promise.all(input.buffers.map(decodeImageToFrame));
    const detection = detectWatermarkInFrames(frames, candidates);
    const enriched = await enrichDetectionResult(detection);

    await db.watermarkDetectionLog.create({
      data: {
        watermarkSessionId: enriched.sessionId,
        contentId: enriched.contentId ?? input.contentId,
        detectionType: input.sourceKind === "video" ? "video" : "image",
        confidence: enriched.confidence,
        detectedRegions: enriched.detectedRegions,
        sourceFileHash,
        resultStatus: enriched.status,
        actorId: input.actorId,
        metadata: {
          jobId,
          integrityValid: enriched.integrityValid,
          eccValid: enriched.eccValid,
          centralScore: enriched.centralScore,
          distributedScore: enriched.distributedScore,
          temporalMatches: enriched.temporalMatches,
          framesAnalyzed: enriched.analysisLog?.framesAnalyzed,
          candidateFrames: enriched.analysisLog?.candidateFrames,
          candidatesSearched: candidates.length,
          scopedToContentId: input.contentId,
          clientReportedFileHash: input.clientFileHash,
        },
      },
    });

    await db.watermarkDetectionJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        sourceFileHash,
        result: JSON.parse(JSON.stringify(enriched)) as object,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    await db.watermarkDetectionJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: e instanceof Error ? e.message : "Detection failed",
        completedAt: new Date(),
      },
    });
  }
}
