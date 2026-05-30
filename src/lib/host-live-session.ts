/** @deprecated — use @/lib/live-broadcast */
export {
  closeStaleHostLiveChannels,
  endHostBroadcastChannel,
  findBlockingHostBroadcast,
  prepareHostForNewBroadcast,
  releaseAllHostBroadcastSessions,
  releaseBroadcastSession,
  listHostBroadcastSessions,
} from "@/lib/live-broadcast/session-manager";
