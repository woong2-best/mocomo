"use server";

import type { BroadcastRole, SupportTierLevel } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  assignBroadcastRole,
  listBroadcastRoleLogs,
  listBroadcastRoleMembers,
  removeBroadcastRole,
  searchUsersForBroadcastRole,
} from "@/lib/live-broadcast/role-service";
import {
  banLiveChatUser,
  listLiveChatBans,
  timeoutLiveChatUser,
  unbanLiveChatUser,
} from "@/lib/live-broadcast/chat-access";
import {
  getEffectiveBroadcastRole,
  listPermissionsForRole,
  requireBroadcastPermission,
} from "@/lib/live-broadcast/permissions";
import { db } from "@/lib/db";
import { liveRoomCacheTag } from "@/lib/cached-live-meta";

export async function getMyBroadcastPermissionsAction(channelId: string) {
  const user = await requireAuth();
  const role = await getEffectiveBroadcastRole(channelId, user.id);
  return {
    role,
    permissions: listPermissionsForRole(role),
    canModerate: listPermissionsForRole(role).some((p) => p.startsWith("chat.")),
    canManageRoles:
      role === "OWNER" || listPermissionsForRole(role).some((p) => p.startsWith("roles.")),
  };
}

export async function listBroadcastRolesAction(channelId: string) {
  const user = await requireAuth();
  const perm = await requireBroadcastPermission(user.id, channelId, "roles.manage");
  const permMod = await requireBroadcastPermission(user.id, channelId, "roles.assign_moderator");
  if (!perm.ok && !permMod.ok) {
    return { error: "역할 목록을 볼 권한이 없습니다." };
  }
  const members = await listBroadcastRoleMembers(channelId);
  const logs = await listBroadcastRoleLogs(channelId, 30);
  return { members, logs };
}

export async function searchBroadcastRoleUsersAction(channelId: string, query: string) {
  const user = await requireAuth();
  const perm = await requireBroadcastPermission(user.id, channelId, "roles.manage");
  const permMod = await requireBroadcastPermission(user.id, channelId, "roles.assign_moderator");
  if (!perm.ok && !permMod.ok) {
    return { error: "사용자 검색 권한이 없습니다." };
  }
  const users = await searchUsersForBroadcastRole(user.id, channelId, query);
  return { users };
}

export async function assignBroadcastRoleAction(
  channelId: string,
  targetUserId: string,
  role: BroadcastRole
) {
  const user = await requireAuth();
  const result = await assignBroadcastRole({
    channelId,
    actorId: user.id,
    targetUserId,
    role,
  });
  if ("success" in result && result.success) {
    revalidateTag(liveRoomCacheTag(channelId));
  }
  return result;
}

export async function removeBroadcastRoleAction(channelId: string, targetUserId: string) {
  const user = await requireAuth();
  const result = await removeBroadcastRole({
    channelId,
    actorId: user.id,
    targetUserId,
  });
  if ("success" in result && result.success) {
    revalidateTag(liveRoomCacheTag(channelId));
  }
  return result;
}

export async function timeoutLiveChatUserAction(
  channelId: string,
  targetUserId: string,
  durationSeconds: number
) {
  const user = await requireAuth();
  return timeoutLiveChatUser({
    channelId,
    actorId: user.id,
    targetUserId,
    durationSeconds,
  });
}

export async function banLiveChatUserAction(
  channelId: string,
  targetUserId: string,
  reason?: string
) {
  const user = await requireAuth();
  return banLiveChatUser({
    channelId,
    actorId: user.id,
    targetUserId,
    reason,
  });
}

export async function unbanLiveChatUserAction(channelId: string, targetUserId: string) {
  const user = await requireAuth();
  return unbanLiveChatUser({
    channelId,
    actorId: user.id,
    targetUserId,
  });
}

export async function listLiveChatBansAction(channelId: string) {
  const user = await requireAuth();
  const perm = await requireBroadcastPermission(user.id, channelId, "chat.ban");
  if (!perm.ok) return { error: perm.error };
  const bans = await listLiveChatBans(channelId);
  return { bans };
}

export async function updateLiveChatSettingsAction(
  channelId: string,
  data: {
    slowModeSeconds?: number;
    chatBannedWords?: string[];
    chatFollowersOnly?: boolean;
    chatSubscribersOnly?: boolean;
    chatMinTierExempt?: SupportTierLevel | null;
  }
) {
  const user = await requireAuth();
  const perm = await requireBroadcastPermission(user.id, channelId, "chat.settings");
  if (!perm.ok) return { error: perm.error };

  await db.voiceChannel.update({
    where: { id: channelId },
    data: {
      slowModeSeconds:
        data.slowModeSeconds !== undefined
          ? Math.min(120, Math.max(0, data.slowModeSeconds))
          : undefined,
      chatBannedWords: data.chatBannedWords?.slice(0, 30),
      chatFollowersOnly: data.chatFollowersOnly,
      chatSubscribersOnly: data.chatSubscribersOnly,
      chatMinTierExempt: data.chatMinTierExempt,
    },
  });
  revalidateTag(liveRoomCacheTag(channelId));
  return { success: true as const };
}
