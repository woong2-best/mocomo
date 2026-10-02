import type { BroadcastRole } from "@prisma/client";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";
import type { MessageKey } from "@/lib/i18n/message-keys";

/** Effective broadcast role including implicit owner */
export type EffectiveBroadcastRole = "OWNER" | BroadcastRole | "VIEWER";

export const BROADCAST_ROLE_RANK: Record<EffectiveBroadcastRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  MODERATOR: 2,
  VIP: 1,
  VIEWER: 0,
};

export type BroadcastPermission =
  | "broadcast.edit"
  | "broadcast.end"
  | "broadcast.delete"
  | "broadcast.settings.ads"
  | "chat.delete"
  | "chat.timeout"
  | "chat.ban"
  | "chat.unban"
  | "chat.settings"
  | "chat.pin"
  | "chat.reports"
  | "roles.manage"
  | "roles.assign_moderator"
  | "roles.assign_vip"
  | "polls.manage"
  | "events.manage";

const PERMISSIONS_BY_ROLE: Record<EffectiveBroadcastRole, ReadonlySet<BroadcastPermission>> = {
  OWNER: new Set([
    "broadcast.edit",
    "broadcast.end",
    "broadcast.delete",
    "broadcast.settings.ads",
    "chat.delete",
    "chat.timeout",
    "chat.ban",
    "chat.unban",
    "chat.settings",
    "chat.pin",
    "chat.reports",
    "roles.manage",
    "roles.assign_moderator",
    "roles.assign_vip",
    "polls.manage",
    "events.manage",
  ]),
  MANAGER: new Set([
    "broadcast.edit",
    "chat.delete",
    "chat.timeout",
    "chat.ban",
    "chat.unban",
    "chat.settings",
    "chat.pin",
    "chat.reports",
    "roles.assign_moderator",
    "roles.assign_vip",
    "polls.manage",
    "events.manage",
  ]),
  MODERATOR: new Set([
    "chat.delete",
    "chat.timeout",
    "chat.ban",
    "chat.unban",
    "chat.settings",
    "chat.pin",
    "chat.reports",
  ]),
  VIP: new Set([]),
  VIEWER: new Set([]),
};

export function roleRank(role: EffectiveBroadcastRole): number {
  return BROADCAST_ROLE_RANK[role] ?? 0;
}

export function hasBroadcastPermission(
  role: EffectiveBroadcastRole,
  permission: BroadcastPermission
): boolean {
  return PERMISSIONS_BY_ROLE[role]?.has(permission) ?? false;
}

export function canAssignBroadcastRole(
  actorRole: EffectiveBroadcastRole,
  targetCurrentRole: EffectiveBroadcastRole,
  newRole: BroadcastRole | null
): boolean {
  if (actorRole === "VIEWER" || actorRole === "VIP" || actorRole === "MODERATOR") {
    return false;
  }
  if (targetCurrentRole === "OWNER") return false;
  if (roleRank(targetCurrentRole) >= roleRank(actorRole)) return false;

  if (newRole === "MANAGER") {
    return actorRole === "OWNER";
  }
  // MODERATOR / VIP 신규 지정 중단 — 관리자만
  if (newRole === "MODERATOR" || newRole === "VIP") {
    return false;
  }
  // removal
  if (targetCurrentRole === "MANAGER") {
    return actorRole === "OWNER";
  }
  if (targetCurrentRole === "MODERATOR" || targetCurrentRole === "VIP") {
    return actorRole === "OWNER" || actorRole === "MANAGER";
  }
  return false;
}

export async function getEffectiveBroadcastRole(
  channelId: string,
  userId: string
): Promise<EffectiveBroadcastRole> {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return "VIEWER";
  if (channel.createdBy === userId) return "OWNER";

  const assignment = await db.broadcastRoleAssignment.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { role: true },
  });
  if (assignment?.role) return assignment.role;

  // Streamer-scoped staff (persists across broadcasts)
  const staff = await db.streamerStaffAssignment.findUnique({
    where: {
      hostUserId_userId: { hostUserId: channel.createdBy, userId },
    },
    select: { role: true },
  });
  return staff?.role ?? "VIEWER";
}

export async function getBroadcastRolesForUsers(
  channelId: string,
  userIds: string[]
): Promise<Map<string, EffectiveBroadcastRole>> {
  const map = new Map<string, EffectiveBroadcastRole>();
  if (userIds.length === 0) return map;

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return map;

  const uniqueIds = [...new Set(userIds)];
  for (const uid of uniqueIds) {
    if (uid === channel.createdBy) {
      map.set(uid, "OWNER");
    }
  }

  const rest = uniqueIds.filter((id) => id !== channel.createdBy);
  if (rest.length === 0) return map;

  const [rows, staffRows] = await Promise.all([
    db.broadcastRoleAssignment.findMany({
      where: { channelId, userId: { in: rest } },
      select: { userId: true, role: true },
    }),
    db.streamerStaffAssignment.findMany({
      where: { hostUserId: channel.createdBy, userId: { in: rest } },
      select: { userId: true, role: true },
    }),
  ]);
  for (const row of staffRows) {
    map.set(row.userId, row.role);
  }
  for (const row of rows) {
    map.set(row.userId, row.role);
  }
  for (const uid of rest) {
    if (!map.has(uid)) map.set(uid, "VIEWER");
  }
  return map;
}

export async function requireBroadcastPermission(
  userId: string,
  channelId: string,
  permission: BroadcastPermission
): Promise<{ ok: true; role: EffectiveBroadcastRole } | { ok: false; error: string }> {
  const role = await getEffectiveBroadcastRole(channelId, userId);
  if (!hasBroadcastPermission(role, permission)) {
    return { ok: false, error: "You do not have permission for this broadcast." };
  }
  return { ok: true, role };
}

export function listPermissionsForRole(role: EffectiveBroadcastRole): BroadcastPermission[] {
  return [...(PERMISSIONS_BY_ROLE[role] ?? [])];
}

/** Manager chat username color — matches manager badge triangle */
export const MANAGER_CHAT_COLOR = "#5CE1E6";

const BROADCAST_ROLE_KEYS: Record<EffectiveBroadcastRole, MessageKey> = {
  OWNER: "live.role.owner",
  MANAGER: "live.role.manager",
  MODERATOR: "live.role.moderator",
  VIP: "live.role.vip",
  VIEWER: "live.role.viewer",
};

export function broadcastRoleLabel(locale: Locale, role: EffectiveBroadcastRole): string {
  return translate(locale, BROADCAST_ROLE_KEYS[role] ?? "live.role.viewer");
}

/** @deprecated Use broadcastRoleLabel(locale, role) */
export function broadcastRoleLabelKo(role: EffectiveBroadcastRole): string {
  return broadcastRoleLabel("ko", role);
}
