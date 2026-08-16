/**
 * LiveKit WebRTC globals are heavy — only register when Live / DM call opens.
 * Never call from index.ts cold start.
 */
let liveKitReady: Promise<void> | null = null;

export function ensureLiveKitGlobals(): Promise<void> {
  if (!liveKitReady) {
    liveKitReady = import("@livekit/react-native").then(({ registerGlobals }) => {
      registerGlobals();
    });
  }
  return liveKitReady;
}
