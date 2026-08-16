import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { rateLimitPublicApi, verifyApiOrigin } from "@/lib/api-security";
import { validateBufferMime } from "@/lib/file-magic";
import { hashFileSha256 } from "@/lib/watermark/crypto/secrets";
import { formatDetectionMessage } from "@/lib/watermark/decoder/confidence";
import {
  detectWatermarkFromImageBuffer,
  detectWatermarkFromVideoBuffer,
} from "@/lib/watermark/decoder/pipeline";
import {
  recordDetectionHit,
  resolveWatermarkSession,
} from "@/lib/watermark/session/service";
import type { AdminWatermarkDetectionResponse } from "@/lib/watermark/types";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

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
  base: Awaited<ReturnType<typeof detectWatermarkFromImageBuffer>> & {
    framesAnalyzed?: number;
    candidateFrames?: number;
  }
): Promise<AdminWatermarkDetectionResponse> {
  const message = formatDetectionMessage(base.status);

  if (!base.sessionId || base.status !== "MATCH") {
    return {
      ...base,
      message,
      session: null,
      content: null,
      purchase: null,
      member: null,
      analysisLog: {
        framesAnalyzed: base.framesAnalyzed,
        candidateFrames: base.candidateFrames,
      },
    };
  }

  const session = await resolveWatermarkSession(base.sessionId);
  if (!session) {
    return { ...base, message, session: null, content: null, purchase: null, member: null };
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
    analysisLog: {
      framesAnalyzed: base.framesAnalyzed,
      candidateFrames: base.candidateFrames,
    },
  };
}

/** POST /api/admin/watermark/detect — admin forensic analysis upload */
export async function POST(req: NextRequest) {
  const originBlock = verifyApiOrigin(req);
  if (originBlock) return originBlock;

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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
  }

  const declaredMime = file.type || "application/octet-stream";
  const buf = Buffer.from(await file.arrayBuffer());
  if (!validateBufferMime(buf, declaredMime, ALLOWED_MIMES)) {
    return NextResponse.json({ error: "Unsupported or invalid media type" }, { status: 400 });
  }

  const sourceFileHash = hashFileSha256(buf);
  const tmpDir = path.join(process.cwd(), ".tmp", "watermark-detect");
  await mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${randomUUID()}${path.extname(file.name || ".bin")}`);

  try {
    await writeFile(tmpPath, buf);

    const isVideo = declaredMime.startsWith("video/");
    const detection = isVideo
      ? await detectWatermarkFromVideoBuffer(buf)
      : await detectWatermarkFromImageBuffer(buf);

    const enriched = await enrichDetectionResult(detection);

    const { db } = await import("@/lib/db");
    await db.watermarkDetectionLog.create({
      data: {
        watermarkSessionId: enriched.sessionId,
        contentId: enriched.contentId,
        detectionType: isVideo ? "video" : "image",
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
        },
      },
    });

    return NextResponse.json({ ok: true, ...enriched });
  } catch (e) {
    return jsonError(e);
  } finally {
    await unlink(tmpPath).catch(() => undefined);
  }
}
