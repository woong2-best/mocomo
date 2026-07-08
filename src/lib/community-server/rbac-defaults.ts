import type { CommunityRoleType } from "@prisma/client";
import type { CommunityPermissionKey } from "./types";

/** DB CommunityRole.permissions JSON 키 — 시드 시 저장, 런타임에 DB에서 로드 */
export const RBAC_PERMISSION_KEYS: CommunityPermissionKey[] = [
  // Server
  "manageServer",
  "deleteServer",
  "editServerInfo",
  "setJoinMode",
  "setVisibility",
  "editIcon",
  "editBanner",
  "editCategory",
  "viewStats",
  "viewAuditLog",
  // Channels
  "manageChannels",
  "createChannel",
  "deleteChannel",
  "renameChannel",
  "reorderChannels",
  "lockChannel",
  "setSlowMode",
  // Roles
  "manageRoles",
  "assignOwner",
  "assignAdmin",
  "assignModerator",
  "assignVip",
  // Content
  "createPosts",
  "createComments",
  "deletePosts",
  "deleteComments",
  "sendMessages",
  "deleteMessages",
  "pinMessages",
  "attachFiles",
  "announce",
  "moderateChat",
  // Voice / Live
  "connectVoice",
  "speakVoice",
  "useVideo",
  "shareScreen",
  "createVoiceChannel",
  "createVideoChannel",
  "forceMoveVoice",
  "muteMembers",
  "restrictScreenShare",
  "startLive",
  "endLive",
  // Members
  "inviteMembers",
  "approveMembers",
  "manageJoinRequests",
  "kickMembers",
  "banMembers",
  "timeoutMembers",
  // Events / Reports
  "manageEvents",
  "handleReports",
  // VIP perks
  "vipBadge",
  "vipChannels",
  "vipEmoji",
  "vipEvents",
];

export const RBAC_LABELS: Record<CommunityPermissionKey, string> = {
  manageServer: "서버 관리",
  deleteServer: "커뮤니티 삭제",
  editServerInfo: "커뮤니티 정보 수정",
  setJoinMode: "가입 방식 변경",
  setVisibility: "공개/비공개 설정",
  editIcon: "대표 이미지 변경",
  editBanner: "배너 변경",
  editCategory: "카테고리 변경",
  viewStats: "통계 확인",
  viewAuditLog: "활동 로그",
  manageChannels: "채널 관리",
  createChannel: "채널 생성",
  deleteChannel: "채널 삭제",
  renameChannel: "채널 이름 변경",
  reorderChannels: "채널 순서 변경",
  lockChannel: "채널 잠금",
  setSlowMode: "슬로우 모드",
  manageRoles: "역할 관리",
  assignOwner: "Owner 임명",
  assignAdmin: "Admin 임명",
  assignModerator: "Moderator 임명",
  assignVip: "VIP 지급",
  createPosts: "게시글 작성",
  createComments: "댓글 작성",
  deletePosts: "게시글 삭제",
  deleteComments: "댓글 삭제",
  sendMessages: "채팅 전송",
  deleteMessages: "채팅 삭제",
  pinMessages: "메시지 고정",
  attachFiles: "파일 업로드",
  announce: "공지 작성",
  moderateChat: "채팅 관리",
  connectVoice: "음성 참가",
  speakVoice: "음성 발언",
  useVideo: "영상 사용",
  shareScreen: "화면 공유",
  createVoiceChannel: "음성채널 생성",
  createVideoChannel: "영상채널 생성",
  forceMoveVoice: "음성 강제 이동",
  muteMembers: "음소거",
  restrictScreenShare: "화면공유 제한",
  startLive: "라이브 시작",
  endLive: "라이브 종료",
  inviteMembers: "멤버 초대",
  approveMembers: "멤버 승인",
  manageJoinRequests: "가입 요청 관리",
  kickMembers: "멤버 추방",
  banMembers: "멤버 차단",
  timeoutMembers: "타임아웃",
  manageEvents: "이벤트 관리",
  handleReports: "신고 처리",
  vipBadge: "VIP 뱃지",
  vipChannels: "VIP 채널",
  vipEmoji: "VIP 이모지",
  vipEvents: "VIP 이벤트",
};

const MEMBER_DEFAULT: Record<CommunityPermissionKey, boolean> = Object.fromEntries(
  RBAC_PERMISSION_KEYS.map((k) => [k, false])
) as Record<CommunityPermissionKey, boolean>;

const MEMBER_PERMS: Record<CommunityPermissionKey, boolean> = {
  ...MEMBER_DEFAULT,
  createPosts: true,
  createComments: true,
  sendMessages: true,
  attachFiles: true,
  connectVoice: true,
  speakVoice: true,
  useVideo: true,
};

export function rbacDefaultsForRole(type: CommunityRoleType): Record<CommunityPermissionKey, boolean> {
  switch (type) {
    case "OWNER":
      return Object.fromEntries(RBAC_PERMISSION_KEYS.map((k) => [k, true])) as Record<
        CommunityPermissionKey,
        boolean
      >;
    case "ADMIN":
      return {
        ...MEMBER_PERMS,
        manageServer: true,
        editServerInfo: true,
        manageChannels: true,
        createChannel: true,
        deleteChannel: true,
        renameChannel: true,
        manageRoles: true,
        assignModerator: true,
        assignVip: true,
        deletePosts: true,
        deleteComments: true,
        deleteMessages: true,
        moderateChat: true,
        handleReports: true,
        kickMembers: true,
        banMembers: true,
        timeoutMembers: true,
        muteMembers: true,
        manageEvents: true,
        approveMembers: true,
        manageJoinRequests: true,
        announce: true,
        shareScreen: true,
        startLive: true,
        endLive: true,
      };
    case "MODERATOR":
      return {
        ...MEMBER_PERMS,
        deletePosts: true,
        deleteComments: true,
        deleteMessages: true,
        moderateChat: true,
        handleReports: true,
        timeoutMembers: true,
        muteMembers: true,
        announce: true,
        shareScreen: true,
      };
    case "VIP":
      return {
        ...MEMBER_PERMS,
        shareScreen: true,
        vipBadge: true,
        vipChannels: true,
        vipEmoji: true,
        vipEvents: true,
      };
    case "MEMBER":
    default:
      return { ...MEMBER_PERMS };
  }
}

export const MAX_OWNERS = 5;

export const ROLE_GROUP_ORDER: CommunityRoleType[] = [
  "OWNER",
  "ADMIN",
  "MODERATOR",
  "VIP",
  "MEMBER",
];

export const ROLE_GROUP_LABELS: Record<CommunityRoleType, string> = {
  OWNER: "👑 Owner",
  ADMIN: "🛡️ Admin",
  MODERATOR: "🛠️ Moderator",
  VIP: "⭐ VIP",
  MEMBER: "👤 Member",
};
