import type { BroadcastRole, LiveStreamCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { searchUsersForCollab } from "@/lib/dm-user-search";
import {
  canAssignBroadcastRole,
  type EffectiveBroadcastRole,
} from "@/lib/live-broadcast/permissions";
import { isBroadcastPickCategory } from "@/lib/live-categories";

export async function getStreamerStaffRole(
  hostUserId: string,
  userId: string
): Promise<BroadcastRole | null> {
  if (hostUserId === userId) return null;
  const row = await db.streamerStaffAssignment.findUnique({
    where: { hostUserId_userId: { hostUserId, userId } },
    select: { role: true },
  });
  return row?.role ?? null;
}

export async function isStreamerChatBanned(
  hostUserId: string,
  userId: string
): Promise<boolean> {
  if (hostUserId === userId) return false;
  const ban = await db.streamerChatBan.findUnique({
    where: { hostUserId_userId: { hostUserId, userId } },
    select: { id: true },
  });
  return !!ban;
}

export async function listStreamerChatBans(hostUserId: string) {
  const rows = await db.streamerChatBan.findMany({
    where: { hostUserId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, username: true, image: true } },
      issuer: { select: { username: true } },
    },
  });
  return rows.map((r) => ({
    userId: r.user.id,
    username: r.user.username,
    image: r.user.image,
    bannedBy: r.issuer.username,
    reason: r.reason,
    at: r.createdAt.toISOString(),
  }));
}

export async function banStreamerViewer(input: {
  hostUserId: string;
  actorId: string;
  targetUserId: string;
  reason?: string;
  /** When set, also write a channel-scoped ban for the live room */
  channelId?: string;
}) {
  const { hostUserId, actorId, targetUserId, reason, channelId } = input;

  if (targetUserId === hostUserId) {
    return { error: "You cannot block the broadcast owner." };
  }

  if (actorId !== hostUserId) {
    const staff = await getStreamerStaffRole(hostUserId, actorId);
    if (staff !== "MANAGER" && staff !== "MODERATOR") {
      return { error: "You do not have permission to block viewers." };
    }
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true },
  });
  if (!target) return { error: "MoCoMo user not found." };

  const targetStaff = await getStreamerStaffRole(hostUserId, targetUserId);
  if (targetStaff === "MANAGER" && actorId !== hostUserId) {
    return { error: "Moderators can block only the broadcast owner." };
  }

  await db.streamerChatBan.upsert({
    where: { hostUserId_userId: { hostUserId, userId: targetUserId } },
    create: {
      hostUserId,
      userId: targetUserId,
      bannedBy: actorId,
      reason: reason?.slice(0, 200) ?? null,
    },
    update: {
      bannedBy: actorId,
      reason: reason?.slice(0, 200) ?? null,
    },
  });

  if (channelId) {
    await db.liveChatBan.upsert({
      where: { channelId_userId: { channelId, userId: targetUserId } },
      create: {
        channelId,
        userId: targetUserId,
        bannedBy: actorId,
        reason: reason?.slice(0, 200) ?? null,
      },
      update: {
        bannedBy: actorId,
        reason: reason?.slice(0, 200) ?? null,
      },
    });
  }

  return { success: true as const };
}

export async function unbanStreamerViewer(input: {
  hostUserId: string;
  actorId: string;
  targetUserId: string;
  channelId?: string;
}) {
  const { hostUserId, actorId, targetUserId, channelId } = input;

  if (actorId !== hostUserId) {
    const staff = await getStreamerStaffRole(hostUserId, actorId);
    if (staff !== "MANAGER" && staff !== "MODERATOR") {
      return { error: "You do not have permission to unblock." };
    }
  }

  await db.streamerChatBan.deleteMany({
    where: { hostUserId, userId: targetUserId },
  });

  if (channelId) {
    await db.liveChatBan.deleteMany({
      where: { channelId, userId: targetUserId },
    });
  } else {
    // Clear channel bans on the host's recent rooms so in-room lists stay consistent
    const channels = await db.voiceChannel.findMany({
      where: { createdBy: hostUserId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    if (channels.length > 0) {
      await db.liveChatBan.deleteMany({
        where: {
          channelId: { in: channels.map((c) => c.id) },
          userId: targetUserId,
        },
      });
    }
  }

  return { success: true as const };
}

export async function listStreamerStaff(hostUserId: string) {
  const host = await db.user.findUnique({
    where: { id: hostUserId },
    select: userPublicSelect,
  });
  if (!host) return [];

  const rows = await db.streamerStaffAssignment.findMany({
    where: { hostUserId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      user: { select: userPublicSelect },
      assigner: { select: { username: true } },
    },
  });

  return [
    {
      userId: host.id,
      username: host.username,
      name: host.name,
      image: host.image,
      role: "OWNER" as const,
    },
    ...rows.map((a) => ({
      userId: a.user.id,
      username: a.user.username,
      name: a.user.name,
      image: a.user.image,
      role: a.role as EffectiveBroadcastRole,
      assignedAt: a.createdAt.toISOString(),
      assignedByUsername: a.assigner.username,
    })),
  ];
}

export async function searchUsersForStreamerStudio(
  actorId: string,
  hostUserId: string,
  query: string
) {
  const hits = await searchUsersForCollab(actorId, query);
  if (hits.length === 0) return [];

  const [staffRows, banRows] = await Promise.all([
    db.streamerStaffAssignment.findMany({
      where: { hostUserId, userId: { in: hits.map((h) => h.id) } },
      select: { userId: true, role: true },
    }),
    db.streamerChatBan.findMany({
      where: { hostUserId, userId: { in: hits.map((h) => h.id) } },
      select: { userId: true },
    }),
  ]);
  const roleByUser = new Map(staffRows.map((r) => [r.userId, r.role]));
  const banned = new Set(banRows.map((b) => b.userId));

  return hits.map((u) => ({
    ...u,
    currentRole:
      u.id === hostUserId
        ? ("OWNER" as const)
        : ((roleByUser.get(u.id) ?? "VIEWER") as EffectiveBroadcastRole),
    isBanned: banned.has(u.id),
  }));
}

export async function assignStreamerStaff(input: {
  hostUserId: string;
  actorId: string;
  targetUserId: string;
  role: BroadcastRole;
}) {
  const { hostUserId, actorId, targetUserId, role } = input;

  if (role !== "MANAGER") {
    return { error: "Only moderator roles can be assigned." };
  }

  if (targetUserId === hostUserId) {
    return { error: "The broadcast owner's role cannot be changed." };
  }

  const actorRole: EffectiveBroadcastRole =
    actorId === hostUserId
      ? "OWNER"
      : ((await getStreamerStaffRole(hostUserId, actorId)) ?? "VIEWER");
  const targetRole: EffectiveBroadcastRole =
    (await getStreamerStaffRole(hostUserId, targetUserId)) ?? "VIEWER";

  if (!canAssignBroadcastRole(actorRole, targetRole, role)) {
    return { error: "You cannot grant that role to this user." };
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true },
  });
  if (!target) return { error: "MoCoMo user not found." };

  await db.streamerStaffAssignment.upsert({
    where: { hostUserId_userId: { hostUserId, userId: targetUserId } },
    create: {
      hostUserId,
      userId: targetUserId,
      role,
      createdBy: actorId,
    },
    update: {
      role,
      createdBy: actorId,
    },
  });

  // Mirror onto recent/active channels so in-room panels stay consistent
  const channels = await db.voiceChannel.findMany({
    where: {
      createdBy: hostUserId,
      liveStatus: { in: ["LIVE", "SCHEDULED"] },
    },
    select: { id: true },
    take: 10,
  });
  for (const ch of channels) {
    await db.broadcastRoleAssignment.upsert({
      where: { channelId_userId: { channelId: ch.id, userId: targetUserId } },
      create: {
        channelId: ch.id,
        userId: targetUserId,
        role,
        createdBy: actorId,
      },
      update: { role, createdBy: actorId },
    });
  }

  return { success: true as const };
}

export async function removeStreamerStaff(input: {
  hostUserId: string;
  actorId: string;
  targetUserId: string;
}) {
  const { hostUserId, actorId, targetUserId } = input;

  if (targetUserId === hostUserId) {
    return { error: "The broadcast owner cannot be removed." };
  }

  const actorRole: EffectiveBroadcastRole =
    actorId === hostUserId
      ? "OWNER"
      : ((await getStreamerStaffRole(hostUserId, actorId)) ?? "VIEWER");
  const targetRole: EffectiveBroadcastRole =
    (await getStreamerStaffRole(hostUserId, targetUserId)) ?? "VIEWER";

  if (!canAssignBroadcastRole(actorRole, targetRole, null)) {
    return { error: "You cannot remove this user's role." };
  }

  await db.streamerStaffAssignment.deleteMany({
    where: { hostUserId, userId: targetUserId },
  });

  const channels = await db.voiceChannel.findMany({
    where: { createdBy: hostUserId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  if (channels.length > 0) {
    await db.broadcastRoleAssignment.deleteMany({
      where: {
        channelId: { in: channels.map((c) => c.id) },
        userId: targetUserId,
      },
    });
  }

  return { success: true as const };
}

export function normalizeStudioCategory(
  cat: LiveStreamCategory | string | null | undefined
): LiveStreamCategory | null {
  if (!cat) return null;
  if (!isBroadcastPickCategory(cat)) return null;
  return cat;
}
