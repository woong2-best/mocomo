import type {
  LiveSupportEventPayload,
  LiveSupportMissionPayload,
  LiveSupportPollPayload,
} from "@/lib/live-support/types";

function relayBaseUrl(): string | null {
  const explicit = process.env.SOCKET_RELAY_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const pub = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!pub || pub.includes("localhost")) return null;
  return pub.replace(/\/$/, "");
}

async function postRelay(path: string, body: unknown): Promise<void> {
  const base = relayBaseUrl();
  const secret = process.env.SOCKET_RELAY_SECRET?.trim();
  if (!base || !secret) return;
  try {
    await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relay-secret": secret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* socket server optional */
  }
}

export async function relayLiveSupportEvent(
  channelId: string,
  event: LiveSupportEventPayload
): Promise<void> {
  await postRelay("/relay/live-support-event", { channelId, event });
}

export async function relayLiveMissionUpdated(
  channelId: string,
  mission: LiveSupportMissionPayload
): Promise<void> {
  await postRelay("/relay/live-mission-updated", { channelId, mission });
}

export async function relayLivePollUpdated(
  channelId: string,
  poll: LiveSupportPollPayload
): Promise<void> {
  await postRelay("/relay/live-poll-updated", { channelId, poll });
}
