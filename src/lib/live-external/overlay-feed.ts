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

export type OverlayFeedResult =
  | {
      ok: true;
      live: true;
      messages: UnifiedChatMessage[];
      meta: { provider: LiveExternalProvider } | null;
      platformReady: boolean;
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
  let nextPageToken: string | null = null;
  let liveChatId: string | null = params.liveChatId ?? null;
  let pollingIntervalMs = 3000;
  let platformUnified: UnifiedChatMessage[] = [];

  if (channel.externalProvider && channel.externalId) {
    const platformResult = await handlePlatformChatRequest(
      {
        externalProvider: channel.externalProvider,
        externalId: channel.externalId,
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
        platformResult.provider === "TWITCH" ||
        !!platformResult.liveChatId ||
        platformResult.messages.length > 0;
      platformUnified = platformToUnified(platformResult.messages);
    }
  }

  const messages = mergeUnifiedChatMessages([mocomoUnified, platformUnified]);

  return {
    ok: true,
    live: true,
    messages,
    meta: meta ? { provider: meta.provider } : null,
    platformReady,
    nextPageToken,
    liveChatId,
    pollingIntervalMs,
  };
}
