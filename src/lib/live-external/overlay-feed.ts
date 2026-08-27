import { db } from "@/lib/db";
import type { OverlayTokenPayload } from "@/lib/live-external/overlay-token";
import { assertOverlayBroadcastAccess, overlayChatMeta } from "@/lib/live-external/overlay-access";
import { handlePlatformChatRequest } from "@/lib/live-external/platform-chat/handler";
import {
  mergeUnifiedChatMessages,
  platformToUnified,
  type UnifiedChatMessage,
} from "@/lib/live-external/platform-chat/merge-messages";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import { cheerRowToUnified, tipRowToUnified } from "@/lib/live-support/support-to-chat";

export type OverlayFeedResult =
  | {
      ok: true;
      live: true;
      messages: UnifiedChatMessage[];
      meta: { provider: LiveExternalProvider; externalId?: string } | null;
      platformReady: boolean;
      platformError: string | null;
      nextPageToken: string | null;
      liveChatId: string | null;
      pollingIntervalMs: number;
    }
  | { ok: false; error: string; status: number };

/** Single OBS feed: MoCoMo DB chat + platform chat (YouTube poll). */
export async function buildOverlayChatFeed(params: {
  channelId: string;
  tokenPayload: OverlayTokenPayload;
  since?: string | null;
  pageToken?: string | null;
  liveChatId?: string | null;
}): Promise<OverlayFeedResult> {
  const access = await assertOverlayBroadcastAccess(params.channelId, params.tokenPayload);
  if (!access.ok) {
    return { ok: false, error: access.error, status: access.status };
  }

  const sinceDate = params.since
    ? new Date(params.since)
    : new Date(Date.now() - 10 * 60_000);
  if (Number.isNaN(sinceDate.getTime())) {
    return { ok: false, error: "since 형식이 올바르지 않습니다.", status: 400 };
  }

  const channel = access.channel;
  const meta = overlayChatMeta(channel);

  const channelSettings = await db.voiceChannel.findUnique({
    where: { id: params.channelId },
    select: { createdBy: true, createdAt: true, donationAlertsOnStream: true },
  });

  const dbMessages = await db.liveChatMessage.findMany({
    where: {
      channelId: params.channelId,
      createdAt: { gt: sinceDate },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { username: true } },
    },
  });

  const mocomoUnified: UnifiedChatMessage[] = dbMessages.map((m) => ({
    id: m.id,
    username: m.user.username,
    content: m.content,
    at: m.createdAt.getTime(),
    source: "MOCOMO",
  }));

  let platformReady = false;
  let platformError: string | null = null;
  let nextPageToken: string | null = null;
  let liveChatId: string | null = params.liveChatId ?? null;
  let pollingIntervalMs = 3000;
  let platformUnified: UnifiedChatMessage[] = [];

  if (channel.externalProvider && channel.externalId) {
    const platformResult = await handlePlatformChatRequest(
      {
        externalProvider: channel.externalProvider,
        externalId: channel.externalId,
        externalChannelId: channel.externalChannelId,
        connectedStreamingAccountId: channel.connectedStreamingAccountId,
      },
      {
        pageToken: params.pageToken ?? null,
        liveChatId: params.liveChatId ?? null,
      }
    );

    if (platformResult.ok) {
      nextPageToken = platformResult.nextPageToken;
      liveChatId = platformResult.liveChatId;
      pollingIntervalMs = Math.min(platformResult.pollingIntervalMs, 5000);
      platformReady =
        !!platformResult.liveChatId || platformResult.messages.length > 0;
      platformError = platformResult.platformError ?? null;
      platformUnified = platformToUnified(platformResult.messages);
    }
  }

  const messages = mergeUnifiedChatMessages([mocomoUnified, platformUnified]);

  let supportUnified: UnifiedChatMessage[] = [];
  if (channelSettings?.donationAlertsOnStream) {
    const sinceForSupport = new Date(
      Math.max(sinceDate.getTime(), channelSettings.createdAt.getTime())
    );
    const [tips, cheers] = await Promise.all([
      db.tip.findMany({
        where: {
          receiverId: channelSettings.createdBy,
          channelId: params.channelId,
          createdAt: { gt: sinceForSupport },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: {
          id: true,
          amount: true,
          message: true,
          createdAt: true,
          sender: { select: { username: true } },
        },
      }),
      db.liveSupportEvent.findMany({
        where: { channelId: params.channelId, createdAt: { gt: sinceForSupport } },
        orderBy: { createdAt: "asc" },
        take: 20,
        select: {
          id: true,
          type: true,
          amount: true,
          message: true,
          metadata: true,
          createdAt: true,
          sender: { select: { username: true } },
        },
      }),
    ]);
    supportUnified = [
      ...tips.map(tipRowToUnified),
      ...cheers.map(cheerRowToUnified),
    ];
  }

  const allMessages = mergeUnifiedChatMessages([messages, supportUnified]);

  return {
    ok: true,
    live: true,
    messages: allMessages,
    meta,
    platformReady,
    platformError,
    nextPageToken,
    liveChatId,
    pollingIntervalMs,
  };
}
