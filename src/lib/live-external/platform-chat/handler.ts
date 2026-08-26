import { db } from "@/lib/db";
import { fetchYoutubeLiveChatMessages } from "@/lib/live-external/platform-chat/youtube-live-chat";
import { resolveChzzkChatSession } from "@/lib/live-external/platform-chat/chzzk-live-chat";
import { getAccountTokens } from "@/lib/streaming-accounts/service";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import type { PlatformChatMessage } from "@/lib/live-external/platform-chat/types";
import {
  sanitizePlatformChatText,
  sanitizePlatformChatUsername,
} from "@/lib/live-external/platform-chat/sanitize";

type ExternalChannelRow = {
  externalProvider: string;
  externalId: string;
  connectedStreamingAccountId: string | null;
};

function sanitizeMessages(messages: PlatformChatMessage[]): PlatformChatMessage[] {
  return messages.map((m) => ({
    ...m,
    username: sanitizePlatformChatUsername(m.username),
    content: sanitizePlatformChatText(m.content),
  }));
}

export type PlatformChatHandlerResult =
  | {
      ok: true;
      provider: LiveExternalProvider;
      messages: PlatformChatMessage[];
      nextPageToken: string | null;
      liveChatId: string | null;
      pollingIntervalMs: number;
      session?: Awaited<ReturnType<typeof resolveChzzkChatSession>>;
    }
  | { ok: false; error: string; status: number };

export async function handlePlatformChatRequest(
  channel: ExternalChannelRow,
  params: {
    pageToken?: string | null;
    liveChatId?: string | null;
    kind?: string | null;
  }
): Promise<PlatformChatHandlerResult> {
  if (!channel.externalProvider || !channel.externalId) {
    return { ok: false, error: "외부 방송이 아닙니다.", status: 400 };
  }

  const provider = channel.externalProvider.toUpperCase() as LiveExternalProvider;
  const pageToken = params.pageToken ?? null;
  const liveChatId = params.liveChatId ?? null;
  const kind = params.kind ?? null;

  if (provider === "CHZZK") {
    const session = await resolveChzzkChatSession(channel.externalId);
    if (kind === "session") {
      return {
        ok: true,
        provider,
        messages: [],
        nextPageToken: null,
        liveChatId: null,
        pollingIntervalMs: 5000,
        session,
      };
    }
    return {
      ok: true,
      provider,
      messages: [],
      nextPageToken: null,
      liveChatId: null,
      pollingIntervalMs: 5000,
      session,
    };
  }

  if (provider === "YOUTUBE") {
    let accessToken: string | null = null;
    if (channel.connectedStreamingAccountId) {
      const account = await db.connectedStreamingAccount.findUnique({
        where: { id: channel.connectedStreamingAccountId },
        select: {
          id: true,
          userId: true,
          platform: true,
          channelId: true,
          channelName: true,
          channelUrl: true,
          profileImage: true,
          verified: true,
          verificationMethod: true,
          verificationCode: true,
          verifiedAt: true,
          revokedAt: true,
          encryptedTokenData: true,
          encryptionIv: true,
          encryptionAuthTag: true,
          encryptionKeyId: true,
          tokenExpiresAt: true,
        },
      });
      if (account && !account.revokedAt && account.verified) {
        const tokens = await getAccountTokens(account);
        accessToken = tokens?.accessToken ?? null;
      }
    }

    const result = await fetchYoutubeLiveChatMessages({
      videoId: channel.externalId,
      accessToken,
      pageToken,
      liveChatId,
    });

    return {
      ok: true,
      provider,
      messages: sanitizeMessages(result.messages),
      nextPageToken: result.nextPageToken,
      liveChatId: result.liveChatId,
      pollingIntervalMs: result.pollingIntervalMs,
    };
  }

  return {
    ok: true,
    provider,
    messages: [],
    nextPageToken: null,
    liveChatId: null,
    pollingIntervalMs: 5000,
  };
}
