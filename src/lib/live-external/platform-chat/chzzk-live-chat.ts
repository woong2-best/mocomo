const CHZZK_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Referer: "https://chzzk.naver.com/",
  Origin: "https://chzzk.naver.com",
};

export type ChzzkChatSession = {
  chatChannelId: string;
  accessToken: string;
  wsServerId: number;
};

/** Chzzk chat shard — same formula as official clients. */
export function chzzkChatWsServerId(chatChannelId: string): number {
  return (
    Math.abs(
      chatChannelId
        .split("")
        .map((c) => c.charCodeAt(0))
        .reduce((a, b) => a + b, 0)
    ) %
      9 +
    1
  );
}

/** Resolve anonymous read-only chat credentials for a live Chzzk channel. */
export async function resolveChzzkChatSession(
  channelId: string
): Promise<ChzzkChatSession | null> {
  const trimmed = channelId.trim();
  if (!trimmed) return null;

  try {
    const statusRes = await fetch(
      `https://api.chzzk.naver.com/polling/v2/channels/${encodeURIComponent(trimmed)}/live-status`,
      { headers: CHZZK_HEADERS, cache: "no-store" }
    );
    if (!statusRes.ok) return null;

    const statusJson = (await statusRes.json()) as {
      content?: { chatChannelId?: string | null; status?: string | null };
    };
    const chatChannelId = statusJson.content?.chatChannelId?.trim();
    if (!chatChannelId || statusJson.content?.status !== "OPEN") return null;

    const tokenRes = await fetch(
      `https://comm-api.game.naver.com/nng_main/v1/chats/access-token?channelId=${encodeURIComponent(chatChannelId)}&chatType=STREAMING`,
      { headers: CHZZK_HEADERS, cache: "no-store" }
    );
    if (!tokenRes.ok) return null;

    const tokenJson = (await tokenRes.json()) as {
      content?: { accessToken?: string | null };
    };
    const accessToken = tokenJson.content?.accessToken?.trim();
    if (!accessToken) return null;

    return {
      chatChannelId,
      accessToken,
      wsServerId: chzzkChatWsServerId(chatChannelId),
    };
  } catch {
    return null;
  }
}
