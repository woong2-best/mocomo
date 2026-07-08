import { RoomServiceClient } from "livekit-server-sdk";
import { getLivekitApiHost } from "@/lib/livekit-host";

export function createLivekitRoomClient(): RoomServiceClient | null {
  const host = getLivekitApiHost();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!host || !apiKey || !secret) return null;
  return new RoomServiceClient(host, apiKey, secret);
}
