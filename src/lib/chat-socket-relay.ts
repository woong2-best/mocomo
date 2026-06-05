/** Server action → Socket.IO room broadcast (socket server 별도 실행 시) */

function relayBaseUrl(): string | null {
  const explicit = process.env.SOCKET_RELAY_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const pub = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!pub || pub.includes("localhost")) return null;
  return pub.replace(/\/$/, "");
}

export async function relayChatMessageToSocket(
  roomId: string,
  message: Record<string, unknown>
): Promise<void> {
  const base = relayBaseUrl();
  const secret = process.env.SOCKET_RELAY_SECRET?.trim();
  if (!base || !secret) return;

  try {
    await fetch(`${base}/relay/chat-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relay-secret": secret,
      },
      body: JSON.stringify({
        roomId,
        message: {
          ...message,
          createdAt:
            typeof message.createdAt === "string"
              ? message.createdAt
              : message.createdAt instanceof Date
                ? message.createdAt.toISOString()
                : new Date().toISOString(),
        },
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* socket server optional */
  }
}
