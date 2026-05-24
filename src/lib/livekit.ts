import { AccessToken } from "livekit-server-sdk";

export async function createLivekitToken(
  roomName: string,
  participantIdentity: string,
  participantName: string
): Promise<string | null> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return null;

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
  });

  return await token.toJwt();
}

export function getLivekitUrl(): string {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || "";
}
