import type { BroadcastRole } from "@prisma/client";
import { db } from "@/lib/db";

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
  if (newRole === "MODERATOR" || newRole === "VIP") {
    return actorRole === "OWNER" || actorRole === "MANAGER";
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
  return assignment?.role ?? "VIEWER";
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

  const rows = await db.broadcastRoleAssignment.findMany({
    where: { channelId, userId: { in: rest } },
    select: { userId: true, role: true },
  });
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
    return { ok: false, error: "이 방송에 대한 권한이 없습니다." };
  }
  return { ok: true, role };
}

export function listPermissionsForRole(role: EffectiveBroadcastRole): BroadcastPermission[] {
  return [...(PERMISSIONS_BY_ROLE[role] ?? [])];
}

/** Manager chat username color — matches manager badge triangle */
export const MANAGER_CHAT_COLOR = "#5CE1E6";

export function broadcastRoleLabelKo(role: EffectiveBroadcastRole): string {
  switch (role) {
    case "OWNER":
      return "방송 소유자";
    case "MANAGER":
      return "관리자";
    case "MODERATOR":
      return "모더레이터";
    case "VIP":
      return "VIP";
    default:
      return "시청자";
  }
}
