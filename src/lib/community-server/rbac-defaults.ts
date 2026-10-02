import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import type { CommunityRoleType } from "@prisma/client";
import type { CommunityPermissionKey } from "./types";

/** DB CommunityRole.permissions JSON 키 — 시드 시 저장, 런타임에 DB에서 로드 */
export const RBAC_PERMISSION_KEYS: CommunityPermissionKey[] = [
  // Bypass
  "administrator",
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
  administrator: t("lib.community-server.s36y345"),
  manageServer: t("lib.community-server.s1wjmsis"),
  deleteServer: t("lib.community-server.s1k39ozr"),
  editServerInfo: t("lib.community-server.sqxbp8m"),
  setJoinMode: t("lib.community-server.s1as9ylq"),
  setVisibility: t("lib.community-server.s1gl9pf2"),
  editIcon: t("lib.community-server.sn5eyed"),
  editBanner: t("lib.community-server.s1burdc5"),
  editCategory: t("lib.community-server.sgey4jd"),
  viewStats: t("lib.community-server.s1ofh4gk"),
  viewAuditLog: t("lib.community-server.s8h8ftr"),
  manageChannels: t("lib.community-server.s13ouznk"),
  createChannel: t("lib.community-server.s13oyers"),
  deleteChannel: t("lib.community-server.s13oyezn"),
  renameChannel: t("lib.community-server.s2y0ddl"),
  reorderChannels: t("lib.community-server.s1i1f64p"),
  lockChannel: t("lib.community-server.s13ozge4"),
  setSlowMode: t("lib.community-server.s1deblxw"),
  manageRoles: t("lib.community-server.sjhcmop"),
  assignOwner: t("lib.community-server.owner"),
  assignAdmin: t("lib.community-server.admin"),
  assignModerator: t("lib.community-server.moderator"),
  assignVip: t("lib.community-server.vip"),
  createPosts: t("lib.community-server.sxq814g"),
  createComments: t("lib.community-server.sbu9tgz"),
  deletePosts: t("lib.community-server.sxq6wan"),
  deleteComments: t("lib.community-server.sbu8on6"),
  sendMessages: t("lib.community-server.s17z6bmk"),
  deleteMessages: t("lib.community-server.s17z53ym"),
  pinMessages: t("lib.community-server.s2wcxi5"),
  attachFiles: t("lib.community-server.s979e1h"),
  announce: t("lib.community-server.s1qgc51x"),
  moderateChat: t("lib.community-server.s17z1omj"),
  connectVoice: t("lib.community-server.smaue77"),
  speakVoice: t("lib.community-server.smarsmv"),
  useVideo: t("lib.community-server.sh6t5tp"),
  shareScreen: t("lib.community-server.s96s11n"),
  createVoiceChannel: t("lib.community-server.s1rxcirn"),
  createVideoChannel: t("lib.community-server.s1hpqn3c"),
  forceMoveVoice: t("lib.community-server.s17v2p37"),
  muteMembers: t("lib.community-server.su4r74"),
  restrictScreenShare: t("lib.community-server.s1p4l0gl"),
  startLive: t("lib.community-server.stup3y9"),
  endLive: t("lib.community-server.stupzoz"),
  inviteMembers: t("lib.community-server.s16a22rc"),
  approveMembers: t("lib.community-server.s16a0fof"),
  manageJoinRequests: t("lib.community-server.shq2kag"),
  kickMembers: t("lib.community-server.s16a27x1"),
  banMembers: t("lib.community-server.s16a1xds"),
  timeoutMembers: t("lib.community-server.sr61fpf"),
  manageEvents: t("lib.community-server.s7wne10"),
  handleReports: t("lib.community-server.s2g6gqc"),
  vipBadge: t("lib.community-server.vip_2"),
  vipChannels: t("lib.community-server.vip_3"),
  vipEmoji: t("lib.community-server.vip_4"),
  vipEvents: t("lib.community-server.vip_5"),
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
        administrator: true,
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
        editBanner: true,
        createChannel: true,
        renameChannel: true,
        reorderChannels: true,
        lockChannel: true,
        setSlowMode: true,
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
