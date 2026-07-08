import type { CommunityChannelType, CommunityPresenceStatus, CommunityRoleType } from "@prisma/client";

export type CommunityPermissionKey =
  | "manageServer"
  | "manageChannels"
  | "manageRoles"
  | "kickMembers"
  | "banMembers"
  | "createPosts"
  | "createComments"
  | "sendMessages"
  | "attachFiles"
  | "connectVoice"
  | "speakVoice"
  | "shareScreen"
  | "useVideo"
  | "pinMessages"
  | "deleteMessages"
  | "deletePosts"
  | "manageEvents"
  | "announce"
  | "moderateChat";

export type CommunityPermissions = Record<CommunityPermissionKey, boolean>;

export type CommunityChannelView = {
  id: string;
  type: CommunityChannelType;
  name: string;
  slug: string;
  topic: string | null;
  position: number;
  isDefault: boolean;
  categoryId: string | null;
  categoryName: string | null;
  chatRoomId: string | null;
  voiceChannelId: string | null;
  maxUsers: number | null;
  unreadCount?: number;
};

export type CommunityMemberView = {
  id: string;
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  nickname: string | null;
  presence: CommunityPresenceStatus;
  roles: { id: string; name: string; type: CommunityRoleType; color: string | null }[];
  isOwner: boolean;
  joinedAt: string;
};

export type CommunityServerContext = {
  communityId: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  isMember: boolean;
  isOwner: boolean;
  permissions: CommunityPermissions;
  channels: CommunityChannelView[];
};

export type VoiceConnectionState = {
  channelId: string | null;
  channelName: string | null;
  channelType: "VOICE" | "VIDEO" | null;
  connected: boolean;
  muted: boolean;
  deafened: boolean;
};
