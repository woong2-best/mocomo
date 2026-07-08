import type { CommunityChannelType, CommunityPresenceStatus, CommunityRoleType, CommunityJoinMode, CommunityVoiceActivity } from "@prisma/client";

export type CommunityPermissionKey =
  | "manageServer"
  | "deleteServer"
  | "editServerInfo"
  | "setJoinMode"
  | "setVisibility"
  | "editIcon"
  | "editBanner"
  | "editCategory"
  | "viewStats"
  | "viewAuditLog"
  | "manageChannels"
  | "createChannel"
  | "deleteChannel"
  | "renameChannel"
  | "reorderChannels"
  | "lockChannel"
  | "setSlowMode"
  | "manageRoles"
  | "assignOwner"
  | "assignAdmin"
  | "assignModerator"
  | "assignVip"
  | "createPosts"
  | "createComments"
  | "deletePosts"
  | "deleteComments"
  | "sendMessages"
  | "deleteMessages"
  | "pinMessages"
  | "attachFiles"
  | "announce"
  | "moderateChat"
  | "connectVoice"
  | "speakVoice"
  | "useVideo"
  | "shareScreen"
  | "createVoiceChannel"
  | "createVideoChannel"
  | "forceMoveVoice"
  | "muteMembers"
  | "restrictScreenShare"
  | "startLive"
  | "endLive"
  | "inviteMembers"
  | "approveMembers"
  | "manageJoinRequests"
  | "kickMembers"
  | "banMembers"
  | "timeoutMembers"
  | "manageEvents"
  | "handleReports"
  | "vipBadge"
  | "vipChannels"
  | "vipEmoji"
  | "vipEvents";

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
  slowModeSec: number;
  isLocked: boolean;
  vipOnly: boolean;
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
  voiceActivity: CommunityVoiceActivity | null;
  roles: { id: string; name: string; type: CommunityRoleType; color: string | null }[];
  primaryRoleType: CommunityRoleType;
  isOwner: boolean;
  joinedAt: string;
};

export type CommunityServerContext = {
  communityId: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  joinMode: CommunityJoinMode;
  isMember: boolean;
  isOwner: boolean;
  isLoggedIn: boolean;
  permissions: CommunityPermissions;
  channels: CommunityChannelView[];
  /** 가입 직후 환영 알림 표시 여부 (서버에서 welcomedAt 없을 때) */
  showWelcome: boolean;
};

export type VoiceConnectionState = {
  channelId: string | null;
  channelName: string | null;
  channelType: "VOICE" | "VIDEO" | null;
  connected: boolean;
  muted: boolean;
  deafened: boolean;
};

export type JoinCommunityResult =
  | {
      success: true;
      isMember: true;
      showWelcome: boolean;
      memberCount: number;
      permissions: CommunityPermissions;
    }
  | { success: true; pending: true; message: string }
  | { error: string };
