/** Vercel API → Socket.IO: notify live room that broadcast ended */

function relayBaseUrl(): string | null {
  const explicit = process.env.SOCKET_RELAY_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const pub = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!pub || pub.includes("localhost")) return null;
  return pub.replace(/\/$/, "");
}

export async function relayLiveEndedToSocket(channelId: string): Promise<void> {
  const base = relayBaseUrl();
  const secret = process.env.SOCKET_RELAY_SECRET?.trim();
  if (!base || !secret) return;

  try {
    await fetch(`${base}/relay/live-ended`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relay-secret": secret,
      },
      body: JSON.stringify({ channelId }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* socket server optional */
  }
}
