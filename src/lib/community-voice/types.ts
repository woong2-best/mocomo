import type { CallSignalPayload } from "@/lib/peer-call/types";

export type CommunityVoiceSignalPayload = CallSignalPayload;

export type CommunityVoiceSignalEvent = {
  channelId: string;
  fromUserId: string;
  payload: CommunityVoiceSignalPayload;
};

export type CommunityVoicePeerEvent = {
  channelId: string;
  userId: string;
  displayName?: string;
};

export type CommunityVoicePeersSnapshot = {
  channelId: string;
  peerIds: string[];
};
