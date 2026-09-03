import type { MessageAttachmentType } from "@prisma/client";
import { CreatorBulkDmJobStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DM_CONTENT_FILTER_WARNING_KO,
  validateCreatorMarketingText,
} from "@/lib/chat-content-filter";
import {
  normalizeChatAttachmentUrl,
  parseChatAttachmentType,
  type ChatAttachmentInput,
} from "@/lib/chat-attachments";
import { getOrCreateDmForUser, sendMobileDmMessage } from "@/lib/chat-dm-service";
import { validateSaleMediaPricing } from "@/lib/money";
import { canViewNsfwContent, nsfwViewerSelect } from "@/lib/nsfw-viewer-access";

const BULK_BATCH_SIZE = 25;
const BULK_MAX_FOLLOWERS = 50_000;

export type CreatorMarketingSettingsDto = {
  welcomeEnabled: boolean;
  welcomeText: string;
  welcomeMedia: {
    url: string;
    type: MessageAttachmentType;
    name: string | null;
    priceKrw: number;
  } | null;
  followerCount: number;
  activeBulkJob: {
    id: string;
    status: CreatorBulkDmJobStatus;
    totalFollowers: number;
    sentCount: number;
    failedCount: number;
    createdAt: string;
    completedAt: string | null;
  } | null;
};

function serializeMarketingRow(
  row: {
    welcomeEnabled: boolean;
    welcomeText: string | null;
    welcomeMediaUrl: string | null;
    welcomeMediaType: MessageAttachmentType | null;
    welcomeMediaName: string | null;
    welcomeMediaPriceKrw: number;
  } | null,
  followerCount: number,
  activeBulkJob: CreatorMarketingSettingsDto["activeBulkJob"]
): CreatorMarketingSettingsDto {
  const welcomeMedia =
    row?.welcomeMediaUrl && row.welcomeMediaType
      ? {
          url: row.welcomeMediaUrl,
          type: row.welcomeMediaType,
          name: row.welcomeMediaName,
          priceKrw: row.welcomeMediaPriceKrw,
        }
      : null;

  return {
    welcomeEnabled: row?.welcomeEnabled ?? false,
    welcomeText: row?.welcomeText ?? "",
    welcomeMedia,
    followerCount,
    activeBulkJob,
  };
}

function parsePaidMarketingMedia(input: {
  url?: string | null;
  type?: string | null;
  name?: string | null;
  priceKrw?: number | null;
  requirePaid?: boolean;
}): { ok: true; media: ChatAttachmentInput | null } | { ok: false; error: string } {
  const urlRaw = typeof input.url === "string" ? input.url.trim() : "";
  if (!urlRaw) {
    if (input.requirePaid) {
      return { ok: false, error: "유료 미디어를 첨부해 주세요." };
    }
    return { ok: true, media: null };
  }

  const url = normalizeChatAttachmentUrl(urlRaw);
  const type =
    typeof input.type === "string" ? parseChatAttachmentType(input.type) : null;
  if (!url || !type) {
    return { ok: false, error: "미디어 형식이 올바르지 않습니다." };
  }
  if (type !== "IMAGE" && type !== "VIDEO") {
    return { ok: false, error: "사진 또는 동영상만 첨부할 수 있습니다." };
  }

  const priceKrw = Math.max(0, Math.round(input.priceKrw ?? 0));
  if (priceKrw <= 0) {
    return { ok: false, error: "유료 미디어는 가격을 설정해야 합니다." };
  }
  const pricingErr = validateSaleMediaPricing(priceKrw);
  if (pricingErr) return { ok: false, error: pricingErr };

  return {
    ok: true,
    media: {
      url,
      type,
      name: typeof input.name === "string" ? input.name.slice(0, 200) : undefined,
      priceKrw,
    },
  };
}

function buildMessagePayload(
  text: string,
  media: ChatAttachmentInput | null
): { ok: true; content?: string; attachments?: ChatAttachmentInput[] } | { ok: false; error: string } {
  const hasText = !!text.trim();
  const hasMedia = !!media;
  if (!hasText && !hasMedia) {
    return { ok: false, error: "메시지 내용 또는 유료 미디어를 입력해 주세요." };
  }
  return {
    ok: true,
    ...(hasText ? { content: text } : {}),
    ...(hasMedia ? { attachments: [media] } : {}),
  };
}

export async function getCreatorMarketingSettings(userId: string): Promise<CreatorMarketingSettingsDto> {
  const [row, followerCount, activeJob] = await Promise.all([
    db.creatorDmMarketing.findUnique({ where: { userId } }),
    db.follow.count({ where: { followingId: userId } }),
    db.creatorBulkDmJob.findFirst({
      where: {
        creatorId: userId,
        status: { in: [CreatorBulkDmJobStatus.PENDING, CreatorBulkDmJobStatus.RUNNING] },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeBulkJob = activeJob
    ? {
        id: activeJob.id,
        status: activeJob.status,
        totalFollowers: activeJob.totalFollowers,
        sentCount: activeJob.sentCount,
        failedCount: activeJob.failedCount,
        createdAt: activeJob.createdAt.toISOString(),
        completedAt: activeJob.completedAt?.toISOString() ?? null,
      }
    : null;

  return serializeMarketingRow(row, followerCount, activeBulkJob);
}

export async function saveCreatorWelcomeMessage(
  userId: string,
  input: {
    enabled: boolean;
    text?: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    mediaName?: string | null;
    mediaPriceKrw?: number | null;
  }
): Promise<{ ok: true; settings: CreatorMarketingSettingsDto } | { ok: false; error: string }> {
  const textValidation = validateCreatorMarketingText(input.text);
  if (!textValidation.ok) return textValidation;

  const mediaResult = parsePaidMarketingMedia({
    url: input.mediaUrl,
    type: input.mediaType,
    name: input.mediaName,
    priceKrw: input.mediaPriceKrw,
  });
  if (!mediaResult.ok) return mediaResult;

  if (input.enabled) {
    const payload = buildMessagePayload(textValidation.text, mediaResult.media);
    if (!payload.ok) return payload;
  }

  await db.creatorDmMarketing.upsert({
    where: { userId },
    create: {
      userId,
      welcomeEnabled: input.enabled,
      welcomeText: textValidation.text || null,
      welcomeMediaUrl: mediaResult.media?.url ?? null,
      welcomeMediaType: mediaResult.media?.type ?? null,
      welcomeMediaName: mediaResult.media?.name ?? null,
      welcomeMediaPriceKrw: mediaResult.media?.priceKrw ?? 0,
    },
    update: {
      welcomeEnabled: input.enabled,
      welcomeText: textValidation.text || null,
      welcomeMediaUrl: mediaResult.media?.url ?? null,
      welcomeMediaType: mediaResult.media?.type ?? null,
      welcomeMediaName: mediaResult.media?.name ?? null,
      welcomeMediaPriceKrw: mediaResult.media?.priceKrw ?? 0,
    },
  });

  const settings = await getCreatorMarketingSettings(userId);
  return { ok: true, settings };
}

export async function deliverWelcomeDm(creatorId: string, followerId: string) {
  if (creatorId === followerId) return;

  const settings = await db.creatorDmMarketing.findUnique({
    where: { userId: creatorId },
  });
  if (!settings?.welcomeEnabled) return;

  const text = (settings.welcomeText ?? "").trim();
  const media =
    settings.welcomeMediaUrl && settings.welcomeMediaType
      ? {
          url: settings.welcomeMediaUrl,
          type: settings.welcomeMediaType,
          name: settings.welcomeMediaName ?? undefined,
          priceKrw: settings.welcomeMediaPriceKrw,
        }
      : null;

  const payload = buildMessagePayload(text, media);
  if (!payload.ok) return;

  const room = await getOrCreateDmForUser(creatorId, followerId);
  if ("error" in room) return;

  await sendMobileDmMessage(creatorId, {
    roomId: room.roomId,
    content: payload.content,
    attachments: payload.attachments,
  });
}

export async function sendWelcomeDmOnNewFollow(creatorId: string, followerId: string) {
  if (creatorId === followerId) return;

  const settings = await db.creatorDmMarketing.findUnique({
    where: { userId: creatorId },
  });
  if (!settings?.welcomeEnabled) return;

  const follower = await db.user.findUnique({
    where: { id: followerId },
    select: nsfwViewerSelect,
  });

  if (!canViewNsfwContent(follower)) {
    await db.creatorWelcomeDmPending.upsert({
      where: {
        creatorId_followerId: { creatorId, followerId },
      },
      create: { creatorId, followerId },
      update: {},
    });
    return;
  }

  await deliverWelcomeDm(creatorId, followerId);
}

/** 성인인증 완료 후 대기 중이던 크리에이터 웰컴 DM 일괄 발송 */
export async function flushPendingWelcomeDmsForFollower(followerId: string) {
  const pending = await db.creatorWelcomeDmPending.findMany({
    where: { followerId },
    select: { creatorId: true },
    orderBy: { createdAt: "asc" },
  });

  for (const { creatorId } of pending) {
    try {
      await deliverWelcomeDm(creatorId, followerId);
    } catch (e) {
      console.error("[flushPendingWelcomeDmsForFollower]", creatorId, followerId, e);
    }
    await db.creatorWelcomeDmPending
      .delete({
        where: { creatorId_followerId: { creatorId, followerId } },
      })
      .catch(() => undefined);
  }
}

export async function enqueueCreatorBulkDm(
  creatorId: string,
  input: {
    text?: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    mediaName?: string | null;
    mediaPriceKrw?: number | null;
  }
): Promise<
  | { ok: true; jobId: string; totalFollowers: number; settings: CreatorMarketingSettingsDto }
  | { ok: false; error: string }
> {
  const active = await db.creatorBulkDmJob.findFirst({
    where: {
      creatorId,
      status: { in: [CreatorBulkDmJobStatus.PENDING, CreatorBulkDmJobStatus.RUNNING] },
    },
    select: { id: true },
  });
  if (active) {
    return { ok: false, error: "이미 진행 중인 단체 발송 작업이 있습니다. 완료 후 다시 시도해 주세요." };
  }

  const textValidation = validateCreatorMarketingText(input.text);
  if (!textValidation.ok) return textValidation;

  const mediaResult = parsePaidMarketingMedia({
    url: input.mediaUrl,
    type: input.mediaType,
    name: input.mediaName,
    priceKrw: input.mediaPriceKrw,
  });
  if (!mediaResult.ok) return mediaResult;

  const payload = buildMessagePayload(textValidation.text, mediaResult.media);
  if (!payload.ok) return payload;

  const totalFollowers = await db.follow.count({ where: { followingId: creatorId } });
  if (totalFollowers === 0) {
    return { ok: false, error: "팔로워가 없어 발송할 수 없습니다." };
  }
  if (totalFollowers > BULK_MAX_FOLLOWERS) {
    return { ok: false, error: `한 번에 ${BULK_MAX_FOLLOWERS.toLocaleString()}명 이하만 발송할 수 있습니다.` };
  }

  const job = await db.creatorBulkDmJob.create({
    data: {
      creatorId,
      content: textValidation.text || null,
      mediaUrl: mediaResult.media?.url ?? null,
      mediaType: mediaResult.media?.type ?? null,
      mediaName: mediaResult.media?.name ?? null,
      mediaPriceKrw: mediaResult.media?.priceKrw ?? 0,
      totalFollowers,
      status: CreatorBulkDmJobStatus.PENDING,
    },
  });

  const settings = await getCreatorMarketingSettings(creatorId);
  return { ok: true, jobId: job.id, totalFollowers, settings };
}

export async function processCreatorBulkDmJob(jobId: string) {
  const job = await db.creatorBulkDmJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  if (job.status === CreatorBulkDmJobStatus.COMPLETED || job.status === CreatorBulkDmJobStatus.FAILED) {
    return;
  }

  await db.creatorBulkDmJob.update({
    where: { id: jobId },
    data: { status: CreatorBulkDmJobStatus.RUNNING },
  });

  const text = (job.content ?? "").trim();
  const media =
    job.mediaUrl && job.mediaType
      ? {
          url: job.mediaUrl,
          type: job.mediaType,
          name: job.mediaName ?? undefined,
          priceKrw: job.mediaPriceKrw,
        }
      : null;

  const payload = buildMessagePayload(text, media);
  if (!payload.ok) {
    await db.creatorBulkDmJob.update({
      where: { id: jobId },
      data: {
        status: CreatorBulkDmJobStatus.FAILED,
        errorMessage: payload.error,
        completedAt: new Date(),
      },
    });
    return;
  }

  let cursorFollowerId = job.cursorFollowerId;
  let sentCount = job.sentCount;
  let failedCount = job.failedCount;

  try {
    while (true) {
      const followers = await db.follow.findMany({
        where: { followingId: job.creatorId },
        orderBy: { followerId: "asc" },
        take: BULK_BATCH_SIZE,
        ...(cursorFollowerId ? { cursor: { followerId_followingId: { followerId: cursorFollowerId, followingId: job.creatorId } }, skip: 1 } : {}),
        select: { followerId: true },
      });

      if (followers.length === 0) break;

      for (const { followerId } of followers) {
        try {
          const room = await getOrCreateDmForUser(job.creatorId, followerId);
          if ("error" in room) {
            failedCount += 1;
            continue;
          }
          const result = await sendMobileDmMessage(job.creatorId, {
            roomId: room.roomId,
            content: payload.content,
            attachments: payload.attachments,
          });
          if ("error" in result) {
            failedCount += 1;
          } else {
            sentCount += 1;
          }
        } catch {
          failedCount += 1;
        }
      }

      cursorFollowerId = followers[followers.length - 1]?.followerId ?? cursorFollowerId;

      await db.creatorBulkDmJob.update({
        where: { id: jobId },
        data: { sentCount, failedCount, cursorFollowerId },
      });

      if (followers.length < BULK_BATCH_SIZE) break;
    }

    await db.creatorBulkDmJob.update({
      where: { id: jobId },
      data: {
        status: CreatorBulkDmJobStatus.COMPLETED,
        sentCount,
        failedCount,
        cursorFollowerId,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    await db.creatorBulkDmJob.update({
      where: { id: jobId },
      data: {
        status: CreatorBulkDmJobStatus.FAILED,
        sentCount,
        failedCount,
        cursorFollowerId,
        errorMessage: e instanceof Error ? e.message : "단체 발송 중 오류가 발생했습니다.",
        completedAt: new Date(),
      },
    });
  }
}

export { DM_CONTENT_FILTER_WARNING_KO };
