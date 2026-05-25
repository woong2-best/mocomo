import { AccessToken, TrackSource } from "livekit-server-sdk";

export async function createLivekitToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
  options?: { audioOnly?: boolean }
): Promise<string | null> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return null;

  try {
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: "6h",
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: options?.audioOnly ? [TrackSource.MICROPHONE] : undefined,
    });

    return await token.toJwt();
  } catch (e) {
    console.error("[createLivekitToken]", e);
    return null;
  }
}

export function getLivekitUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || "";
}

export function isLivekitConfigured(): boolean {
  return !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && getLivekitUrl());
}
