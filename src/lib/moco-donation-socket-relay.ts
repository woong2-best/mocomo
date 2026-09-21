import type { MocoDonationPayload } from "@/lib/moco-donation/types";

export type MocoDonationRelayBody =
  | { event: "new_donation"; donation: MocoDonationPayload }
  | { event: "donation_skipped"; donation: MocoDonationPayload }
  | { event: "donation_completed"; donation: MocoDonationPayload };

function relayBaseUrl(): string | null {
  const explicit = process.env.SOCKET_RELAY_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const pub = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!pub || pub.includes("localhost")) return null;
  return pub.replace(/\/$/, "");
}

export async function relayMocoDonationEvent(
  channelId: string,
  body: MocoDonationRelayBody
): Promise<void> {
  const base = relayBaseUrl();
  const secret = process.env.SOCKET_RELAY_SECRET?.trim();
  if (!base || !secret) return;
  try {
    await fetch(`${base}/relay/moco-donation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relay-secret": secret,
      },
      body: JSON.stringify({ channelId, ...body }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* socket server optional */
  }
}
