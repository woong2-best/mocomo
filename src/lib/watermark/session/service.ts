import { db } from "@/lib/db";
import { isMediaContentLocked } from "@/lib/content-access";
import { getSubscriptionsForViewer } from "@/lib/content-access";
import { getPurchasedPostMediaIds } from "@/lib/post-paid-media";
import {
  getWatermarkVersion,
  isWatermarkEnabled,
  WATERMARK_SESSION_TTL_MS,
  WATERMARK_TEMPORAL_PERIOD,
  WATERMARK_MODULATION_STRENGTH,
} from "@/lib/watermark/config";
import { encodeWatermarkPayload, toBase64 } from "@/lib/watermark/crypto/payload";
import { isWatermarkSecretConfigured } from "@/lib/watermark/crypto/secrets";
import type { ForensicRenderConfig, WatermarkSessionClientResponse } from "@/lib/watermark/types";

export class WatermarkAccessError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "WatermarkAccessError";
    this.status = status;
  }
}

export async function verifyPaidVideoAccess(userId: string, contentId: string) {
  const media = await db.postMedia.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      type: true,
      priceKrw: true,
      post: {
        select: {
          authorId: true,
          visibility: true,
          instantPurchasePriceKrw: true,
        },
      },
    },
  });

  if (!media) throw new WatermarkAccessError(404, "Content not found");
  if (media.type !== "VIDEO") throw new WatermarkAccessError(400, "Forensic watermark applies to paid video only");

  const purchasedIds = await getPurchasedPostMediaIds(userId, [contentId]);
  const subs = await getSubscriptionsForViewer(userId, [media.post.authorId]);
  const subscription = subs.get(media.post.authorId) ?? null;

  const { locked } = isMediaContentLocked({
    viewerId: userId,
    authorId: media.post.authorId,
    visibility: media.post.visibility,
    instantPurchasePriceKrw: media.post.instantPurchasePriceKrw,
    mediaPriceKrw: media.priceKrw,
    purchased: purchasedIds.has(contentId),
    subscription,
  });

  if (locked) throw new WatermarkAccessError(403, "Purchase required");

  const purchase = await db.postMediaPurchase.findUnique({
    where: { buyerId_mediaId: { buyerId: userId, mediaId: contentId } },
    select: { id: true },
  });

  if (!purchase) {
    if (userId === media.post.authorId) {
      throw new WatermarkAccessError(403, "Author playback does not require forensic session");
    }
    throw new WatermarkAccessError(403, "Purchase record required");
  }

  return { media, purchaseId: purchase.id };
}

export async function createWatermarkSession(
  userId: string,
  contentId: string
): Promise<WatermarkSessionClientResponse> {
  if (!isWatermarkEnabled()) {
    throw new WatermarkAccessError(503, "Watermark system disabled");
  }
  if (!isWatermarkSecretConfigured()) {
    throw new WatermarkAccessError(503, "Watermark secret not configured");
  }

  const { purchaseId } = await verifyPaidVideoAccess(userId, contentId);
  const watermarkVersion = getWatermarkVersion();
  const expiresAt = new Date(Date.now() + WATERMARK_SESSION_TTL_MS);
  const pendingOpaque = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const session = await db.watermarkSession.create({
    data: {
      contentId,
      userId,
      purchaseId,
      opaqueWatermarkId: pendingOpaque,
      watermarkVersion,
      sessionNonce: "",
      expiresAt,
      status: "ACTIVE",
    },
  });

  const encoded = encodeWatermarkPayload({
    contentId,
    sessionId: session.id,
    userId,
    purchaseId,
    watermarkVersion,
  });

  await db.watermarkSession.update({
    where: { id: session.id },
    data: {
      opaqueWatermarkId: encoded.opaqueWatermarkId,
      sessionNonce: encoded.sessionNonce,
    },
  });

  const renderConfig: ForensicRenderConfig = {
    watermarkVersion,
    sessionId: session.id,
    spreadSeedB64: toBase64(encoded.spreadSeed),
    codewordB64: toBase64(encoded.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  return {
    sessionId: session.id,
    watermarkVersion,
    renderConfig,
  };
}

export async function resolveWatermarkSession(sessionId: string) {
  return db.watermarkSession.findUnique({
    where: { id: sessionId },
    include: {
      user: { select: { id: true, username: true } },
      purchase: { select: { id: true, price: true, createdAt: true } },
      media: {
        select: {
          id: true,
          post: { select: { title: true, author: { select: { username: true } } } },
        },
      },
    },
  });
}

export async function recordDetectionHit(sessionId: string) {
  await db.watermarkSession.update({
    where: { id: sessionId },
    data: {
      detectionCount: { increment: 1 },
      lastDetectedAt: new Date(),
    },
  });
}
