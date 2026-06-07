import type { Socket } from "socket.io-client";
import type { LiveOverlayState, LiveOverlayStatePayload } from "@/lib/live-overlays/types";

export function publishLiveOverlayState(
  socket: Socket | null,
  channelId: string,
  state: LiveOverlayState
) {
  if (!socket?.connected) return;
  socket.emit("live_overlay_publish", { channelId, state });
}

export function subscribeLiveOverlayState(
  socket: Socket | null,
  onState: (payload: LiveOverlayStatePayload) => void
) {
  if (!socket) return () => {};
  const handler = (payload: LiveOverlayStatePayload) => {
    if (!payload?.channelId || !payload.state?.widgets) return;
    onState(payload);
  };
  socket.on("live_overlay_state", handler);
  return () => socket.off("live_overlay_state", handler);
}
