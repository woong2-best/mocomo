import type { BroadcastRole } from "@prisma/client";
import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { searchUsersForCollab } from "@/lib/dm-user-search";
import {
  canAssignBroadcastRole,
  getEffectiveBroadcastRole,
  type EffectiveBroadcastRole,
} from "@/lib/live-broadcast/permissions";

export type BroadcastRoleMember = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  role: EffectiveBroadcastRole;
  assignedAt?: string;
  assignedByUsername?: string;
};

async function writeRoleLog(input: {
  channelId: string;
  actorUserId: string;
  targetUserId: string;
  action: "ASSIGN" | "UPDATE" | "REMOVE";
  oldRole: BroadcastRole | null;
  newRole: BroadcastRole | null;
}) {
  await db.broadcastRoleLog.create({
    data: {
      channelId: input.channelId,
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      action: input.action,
      oldRole: input.oldRole,
      newRole: input.newRole,
    },
  });
}

export async function listBroadcastRoleMembers(channelId: string): Promise<BroadcastRoleMember[]> {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return [];

  const ownerUser = await db.user.findUnique({
    where: { id: channel.createdBy },
    select: userPublicSelect,
  });
  if (!ownerUser) return [];

  const assignments = await db.broadcastRoleAssignment.findMany({
    where: { channelId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: userPublicSelect },
      assigner: { select: { username: true } },
    },
  });

  const owner: BroadcastRoleMember = {
    userId: ownerUser.id,
    username: ownerUser.username,
    name: ownerUser.name,
    image: ownerUser.image,
    role: "OWNER",
  };

  const others: BroadcastRoleMember[] = assignments.map((a) => ({
    userId: a.user.id,
    username: a.user.username,
    name: a.user.name,
    image: a.user.image,
    role: a.role,
    assignedAt: a.createdAt.toISOString(),
    assignedByUsername: a.assigner.username,
  }));

  return [owner, ...others];
}

export async function searchUsersForBroadcastRole(
  actorId: string,
  channelId: string,
  query: string
) {
  const hits = await searchUsersForCollab(actorId, query);
  if (hits.length === 0) return [];

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return [];

  const roleMap = await db.broadcastRoleAssignment.findMany({
    where: { channelId, userId: { in: hits.map((h) => h.id) } },
    select: { userId: true, role: true },
  });
  const roleByUser = new Map(roleMap.map((r) => [r.userId, r.role]));

  return hits.map((u) => ({
    ...u,
    currentRole:
      u.id === channel.createdBy
        ? ("OWNER" as const)
        : ((roleByUser.get(u.id) ?? "VIEWER") as EffectiveBroadcastRole),
  }));
}

export async function assignBroadcastRole(input: {
  channelId: string;
  actorId: string;
  targetUserId: string;
  role: BroadcastRole;
}) {
  const { channelId, actorId, targetUserId, role } = input;

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다." };
  if (targetUserId === channel.createdBy) {
    return { error: "방송 소유자의 역할은 변경할 수 없습니다." };
  }

  const actorRole = await getEffectiveBroadcastRole(channelId, actorId);
  const targetRole = await getEffectiveBroadcastRole(channelId, targetUserId);

  if (!canAssignBroadcastRole(actorRole, targetRole, role)) {
    return { error: "이 사용자에게 해당 역할을 부여할 권한이 없습니다." };
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  const existing = await db.broadcastRoleAssignment.findUnique({
    where: { channelId_userId: { channelId, userId: targetUserId } },
    select: { role: true },
  });

  if (existing?.role === role) {
    return { success: true as const };
  }

  await db.broadcastRoleAssignment.upsert({
    where: { channelId_userId: { channelId, userId: targetUserId } },
    create: {
      channelId,
      userId: targetUserId,
      role,
      createdBy: actorId,
    },
    update: {
      role,
      createdBy: actorId,
    },
  });

  await writeRoleLog({
    channelId,
    actorUserId: actorId,
    targetUserId,
    action: existing ? "UPDATE" : "ASSIGN",
    oldRole: existing?.role ?? null,
    newRole: role,
  });

  return { success: true as const };
}

export async function removeBroadcastRole(input: {
  channelId: string;
  actorId: string;
  targetUserId: string;
}) {
  const { channelId, actorId, targetUserId } = input;

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다." };
  if (targetUserId === channel.createdBy) {
    return { error: "방송 소유자는 제거할 수 없습니다." };
  }

  const actorRole = await getEffectiveBroadcastRole(channelId, actorId);
  const targetRole = await getEffectiveBroadcastRole(channelId, targetUserId);

  if (!canAssignBroadcastRole(actorRole, targetRole, null)) {
    return { error: "이 사용자의 역할을 제거할 권한이 없습니다." };
  }

  const existing = await db.broadcastRoleAssignment.findUnique({
    where: { channelId_userId: { channelId, userId: targetUserId } },
    select: { role: true },
  });
  if (!existing) return { success: true as const };

  await db.broadcastRoleAssignment.delete({
    where: { channelId_userId: { channelId, userId: targetUserId } },
  });

  await writeRoleLog({
    channelId,
    actorUserId: actorId,
    targetUserId,
    action: "REMOVE",
    oldRole: existing.role,
    newRole: null,
  });

  return { success: true as const };
}

export async function listBroadcastRoleLogs(channelId: string, limit = 50) {
  const rows = await db.broadcastRoleLog.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { username: true } },
      target: { select: { username: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    actorUsername: r.actor.username,
    targetUsername: r.target.username,
    action: r.action,
    oldRole: r.oldRole,
    newRole: r.newRole,
  }));
}
