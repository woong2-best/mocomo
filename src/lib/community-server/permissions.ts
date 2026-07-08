import type { CommunityRoleType } from "@prisma/client";
import type { CommunityPermissionKey, CommunityPermissions } from "./types";

export const ALL_PERMISSION_KEYS: CommunityPermissionKey[] = [
  "manageServer",
  "manageChannels",
  "manageRoles",
  "kickMembers",
  "banMembers",
  "createPosts",
  "createComments",
  "sendMessages",
  "attachFiles",
  "connectVoice",
  "speakVoice",
  "shareScreen",
  "useVideo",
  "pinMessages",
  "deleteMessages",
  "deletePosts",
  "manageEvents",
  "announce",
  "moderateChat",
];

export const PERMISSION_LABELS: Record<CommunityPermissionKey, string> = {
  manageServer: "서버 관리",
  manageChannels: "채널 관리",
  manageRoles: "역할 관리",
  kickMembers: "멤버 추방",
  banMembers: "멤버 차단",
  createPosts: "게시글 작성",
  createComments: "댓글 작성",
  sendMessages: "채팅 전송",
  attachFiles: "파일 첨부",
  connectVoice: "음성 참가",
  speakVoice: "음성 발언",
  shareScreen: "화면 공유",
  useVideo: "영상 사용",
  pinMessages: "메시지 고정",
  deleteMessages: "메시지 삭제",
  deletePosts: "게시글 삭제",
  manageEvents: "이벤트 관리",
  announce: "공지 작성",
  moderateChat: "채팅 관리",
};

const BASE_MEMBER: CommunityPermissions = {
  manageServer: false,
  manageChannels: false,
  manageRoles: false,
  kickMembers: false,
  banMembers: false,
  createPosts: true,
  createComments: true,
  sendMessages: true,
  attachFiles: true,
  connectVoice: true,
  speakVoice: true,
  shareScreen: false,
  useVideo: true,
  pinMessages: false,
  deleteMessages: false,
  deletePosts: false,
  manageEvents: false,
  announce: false,
  moderateChat: false,
};

export function defaultPermissionsForRole(type: CommunityRoleType): CommunityPermissions {
  switch (type) {
    case "OWNER":
      return Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, true])) as CommunityPermissions;
    case "ADMIN":
      return {
        ...BASE_MEMBER,
        manageServer: true,
        manageChannels: true,
        manageRoles: true,
        kickMembers: true,
        banMembers: true,
        pinMessages: true,
        deleteMessages: true,
        deletePosts: true,
        manageEvents: true,
        announce: true,
        moderateChat: true,
        shareScreen: true,
      };
    case "MODERATOR":
      return {
        ...BASE_MEMBER,
        pinMessages: true,
        deleteMessages: true,
        deletePosts: true,
        moderateChat: true,
        announce: true,
        manageEvents: true,
        shareScreen: true,
      };
    case "VIP":
      return {
        ...BASE_MEMBER,
        shareScreen: true,
        pinMessages: false,
      };
    case "MEMBER":
    default:
      return { ...BASE_MEMBER };
  }
}

export function parsePermissions(json: unknown): CommunityPermissions {
  const base = { ...BASE_MEMBER };
  if (!json || typeof json !== "object") return base;
  for (const key of ALL_PERMISSION_KEYS) {
    const val = (json as Record<string, unknown>)[key];
    if (typeof val === "boolean") base[key] = val;
  }
  return base;
}

export function mergePermissions(roles: CommunityPermissions[]): CommunityPermissions {
  const merged = { ...BASE_MEMBER };
  for (const role of roles) {
    for (const key of ALL_PERMISSION_KEYS) {
      if (role[key]) merged[key] = true;
    }
  }
  return merged;
}

export function hasPermission(perms: CommunityPermissions, key: CommunityPermissionKey): boolean {
  return perms[key] === true;
}
