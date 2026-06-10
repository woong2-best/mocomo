/** Vercel API → Socket.IO 라이브 채팅 브로드캐스트 */

export type LiveChatRelayPayload = {
  id: string;
  userId: string;
  username: string;
  content: string;
  at: number;
  image?: string | null;
  supportTierSent?: string;
};

function relayBaseUrl(): string | null {
  const explicit = process.env.SOCKET_RELAY_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const pub = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!pub || pub.includes("localhost")) return null;
  return pub.replace(/\/$/, "");
}

export async function relayLiveChatToSocket(
  channelId: string,
  message: LiveChatRelayPayload
): Promise<void> {
  const base = relayBaseUrl();
  const secret = process.env.SOCKET_RELAY_SECRET?.trim();
  if (!base || !secret) return;

  try {
    await fetch(`${base}/relay/live-chat-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relay-secret": secret,
      },
      body: JSON.stringify({ channelId, message }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* socket server optional */
  }
}
