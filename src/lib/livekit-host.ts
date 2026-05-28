/** wss://project.livekit.cloud → https://project.livekit.cloud (Egress/Twirp API) */
export function getLivekitApiHost(): string {
  const raw = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
  if (!raw) return "";
  return raw.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:").replace(/\/$/, "");
}
