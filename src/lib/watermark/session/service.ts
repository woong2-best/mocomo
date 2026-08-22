import { db } from "@/lib/db";
import { isMediaContentLocked } from "@/lib/content-access";
import { getSubscriptionsForViewer } from "@/lib/content-access";
import { getPurchasedPostMediaIds } from "@/lib/post-paid-media";
import {
  getWatermarkVersion,
  isWatermarkEnabled,
  WATERMARK_SESSION_TTL_MS,
  WATERMARK_TEMPORAL_PERIOD,
  getWatermarkModulationStrength,
  WATERMARK_MODULATION_STRENGTH,
} from "@/lib/watermark/config";
import { encodeWatermarkPayload, toBase64 } from "@/lib/watermark/crypto/payload";
import { isWatermarkSecretConfigured } from "@/lib/watermark/crypto/secrets";
import type { ForensicRenderConfig, WatermarkSessionClientResponse } from "@/lib/watermark/types";
import type { WatermarkContentKind } from "@/lib/paid-media-playback";

export class WatermarkAccessError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "WatermarkAccessError";
    this.status = status;
  }
}

export type PaidVideoAccess = {
  contentKind: WatermarkContentKind;
  contentId: string;
  mediaId: string | null;
  episodeId: string | null;
  purchaseId: string | null;
  episodePurchaseId: string | null;
  subscriptionId: string | null;
};

export async function verifyPaidVideoAccess(
  userId: string,
  contentId: string,
  contentKind: WatermarkContentKind = "POST_MEDIA"
): Promise<PaidVideoAccess> {
  if (contentKind === "EPISODE") {
    return verifyEpisodeAccess(userId, contentId);
  }

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

  if (!media) {
    // Callers that only have an id (episode viewer used to pass episode ids
    // here) get a second look instead of a misleading 404.
    const episode = await db.creatorEpisode.findUnique({
      where: { id: contentId },
      select: { id: true },
    });
    if (episode) return verifyEpisodeAccess(userId, contentId);
    throw new WatermarkAccessError(404, "Content not found");
  }
  if (media.type !== "VIDEO" && media.type !== "IMAGE") {
    throw new WatermarkAccessError(400, "Forensic watermark applies to paid image or video only");
  }

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

  if (userId === media.post.authorId) {
    throw new WatermarkAccessError(403, "Author playback does not require forensic session");
  }

  const purchase = await db.postMediaPurchase.findUnique({
    where: { buyerId_mediaId: { buyerId: userId, mediaId: contentId } },
    select: { id: true },
  });
  if (purchase) {
    return {
      contentKind: "POST_MEDIA",
      contentId,
      mediaId: contentId,
      episodeId: null,
      purchaseId: purchase.id,
      episodePurchaseId: null,
      subscriptionId: null,
    };
  }

  if (subscription) {
    const row = await db.subscription.findFirst({
      where: { subscriberId: userId, creatorId: media.post.authorId, status: "active" },
      select: { id: true },
    });
    if (row) {
      return {
        contentKind: "POST_MEDIA",
        contentId,
        mediaId: contentId,
        episodeId: null,
        purchaseId: null,
        episodePurchaseId: null,
        subscriptionId: row.id,
      };
    }
  }

  throw new WatermarkAccessError(403, "Purchase record required");
}

async function verifyEpisodeAccess(userId: string, episodeId: string): Promise<PaidVideoAccess> {
  const episode = await db.creatorEpisode.findUnique({
    where: { id: episodeId },
    select: {
      id: true,
      price: true,
      videoUrl: true,
      authorId: true,
    },
  });
  if (!episode || !episode.videoUrl) throw new WatermarkAccessError(404, "Content not found");
  if (episode.price <= 0) {
    throw new WatermarkAccessError(400, "Forensic watermark applies to paid video only");
  }
  if (userId === episode.authorId) {
    throw new WatermarkAccessError(403, "Author playback does not require forensic session");
  }

  const purchase = await db.creatorEpisodePurchase.findUnique({
    where: { buyerId_episodeId: { buyerId: userId, episodeId } },
    select: { id: true },
  });
  if (!purchase) throw new WatermarkAccessError(403, "Purchase required");

  return {
    contentKind: "EPISODE",
    contentId: episodeId,
    mediaId: null,
    episodeId,
    purchaseId: null,
    episodePurchaseId: purchase.id,
    subscriptionId: null,
  };
}

export async function createWatermarkSession(
  userId: string,
  contentId: string,
  contentKind: WatermarkContentKind = "POST_MEDIA"
): Promise<WatermarkSessionClientResponse> {
  if (!isWatermarkEnabled()) {
    throw new WatermarkAccessError(503, "Watermark system disabled");
  }
  if (!isWatermarkSecretConfigured()) {
    throw new WatermarkAccessError(503, "Watermark secret not configured");
  }

  const access = await verifyPaidVideoAccess(userId, contentId, contentKind);
  const accessRef =
    access.purchaseId ?? access.episodePurchaseId ?? `sub:${access.subscriptionId}`;
  const watermarkVersion = getWatermarkVersion();
  const expiresAt = new Date(Date.now() + WATERMARK_SESSION_TTL_MS);
  const pendingOpaque = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const session = await db.watermarkSession.create({
    data: {
      contentKind: access.contentKind,
      contentId: access.contentId,
      userId,
      mediaId: access.mediaId,
      episodeId: access.episodeId,
      purchaseId: access.purchaseId,
      episodePurchaseId: access.episodePurchaseId,
      subscriptionId: access.subscriptionId,
      opaqueWatermarkId: pendingOpaque,
      watermarkVersion,
      sessionNonce: "",
      expiresAt,
      status: "ACTIVE",
    },
  });

  const encoded = encodeWatermarkPayload({
    contentId: access.contentId,
    sessionId: session.id,
    userId,
    purchaseId: accessRef,
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
    modulationStrength: getWatermarkModulationStrength(),
  };

  return {
    sessionId: session.id,
    watermarkVersion,
    renderConfig,
  };
}

export async function loadDetectionCandidates(options: {
  contentId?: string | null;
  sessionId?: string | null;
  limit?: number;
}) {
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 2000);
  if (options.sessionId) {
    return db.watermarkSession.findMany({
      where: { id: options.sessionId },
      take: 1,
      select: {
        id: true,
        contentId: true,
        userId: true,
        purchaseId: true,
        episodePurchaseId: true,
        subscriptionId: true,
        sessionNonce: true,
        watermarkVersion: true,
        opaqueWatermarkId: true,
      },
    });
  }
  return db.watermarkSession.findMany({
    where: options.contentId ? { contentId: options.contentId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      contentId: true,
      userId: true,
      purchaseId: true,
      episodePurchaseId: true,
      subscriptionId: true,
      sessionNonce: true,
      watermarkVersion: true,
      opaqueWatermarkId: true,
    },
  });
}

export async function resolveWatermarkSession(sessionId: string) {
  return db.watermarkSession.findUnique({
    where: { id: sessionId },
    include: {
      user: { select: { id: true, username: true } },
      purchase: { select: { id: true, price: true, createdAt: true } },
      episodePurchase: { select: { id: true, price: true, createdAt: true } },
      media: {
        select: {
          id: true,
          post: { select: { title: true, author: { select: { username: true } } } },
        },
      },
      episode: {
        select: {
          id: true,
          title: true,
          author: { select: { username: true } },
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
