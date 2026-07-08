"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCachedCurrentUser, requireAuth } from "@/lib/auth";
import { normalizeCommunitySlugParam } from "@/lib/community-slug";
import { ensureCommunityServerProvisioned } from "@/lib/community-server/provision";
import {
  mergePermissions,
  parsePermissions,
  defaultPermissionsForRole,
  hasPermission,
} from "@/lib/community-server/permissions";
import type {
  CommunityChannelView,
  CommunityMemberView,
  CommunityPermissions,
  CommunityServerContext,
} from "@/lib/community-server/types";
import type { CommunityChannelType, CommunityPresenceStatus } from "@prisma/client";
import { prismaErrorMessage } from "@/lib/prisma-user-error";

async function loadMemberPermissions(
  communityId: string,
  userId: string,
  isOwner: boolean
): Promise<CommunityPermissions> {
  if (isOwner) return defaultPermissionsForRole("OWNER");

  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    include: {
      memberRoles: {
        include: { role: { select: { permissions: true, type: true } } },
      },
    },
  });
  if (!member) {
    return defaultPermissionsForRole("MEMBER");
  }

  const fromRoles = member.memberRoles.map((mr) => parsePermissions(mr.role.permissions));
  if (fromRoles.length === 0) {
    return member.role === "owner"
      ? defaultPermissionsForRole("OWNER")
      : defaultPermissionsForRole("MEMBER");
  }
  return mergePermissions(fromRoles);
}

export async function getCommunityServerContext(slug: string): Promise<CommunityServerContext | null> {
  const normalizedSlug = normalizeCommunitySlugParam(slug);
  if (!normalizedSlug) return null;

  const user = await getCachedCurrentUser();
  const community = await db.community.findUnique({
    where: { slug: normalizedSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      iconUrl: true,
      memberCount: true,
      creatorId: true,
    },
  });
  if (!community) return null;

  await ensureCommunityServerProvisioned(community.id);

  let isMember = false;
  let isOwner = false;
  if (user) {
    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: user.id } },
      select: { role: true },
    });
    isMember = !!member;
    isOwner = community.creatorId === user.id || member?.role === "owner";
  }

  const permissions = user
    ? await loadMemberPermissions(community.id, user.id, isOwner)
    : defaultPermissionsForRole("MEMBER");

  const channelsRaw = await db.communityChannel.findMany({
    where: { communityId: community.id },
    orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
    include: { category: { select: { id: true, name: true } } },
  });

  const unreadByChannel = new Map<string, number>();
  if (user) {
    const reads = await db.communityChannelRead.findMany({
      where: {
        userId: user.id,
        channelId: { in: channelsRaw.map((c) => c.id) },
      },
      select: { channelId: true, lastReadAt: true },
    });
    const readMap = new Map(reads.map((r) => [r.channelId, r.lastReadAt]));

    for (const ch of channelsRaw) {
      if (!ch.chatRoomId) continue;
      const lastRead = readMap.get(ch.id);
      const count = await db.message.count({
        where: {
          roomId: ch.chatRoomId,
          ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
          NOT: user ? { senderId: user.id } : undefined,
        },
      });
      if (count > 0) unreadByChannel.set(ch.id, count);
    }
  }

  const channels: CommunityChannelView[] = channelsRaw.map((ch) => ({
    id: ch.id,
    type: ch.type,
    name: ch.name,
    slug: ch.slug,
    topic: ch.topic,
    position: ch.position,
    isDefault: ch.isDefault,
    categoryId: ch.categoryId,
    categoryName: ch.category?.name ?? null,
    chatRoomId: ch.chatRoomId,
    voiceChannelId: ch.voiceChannelId,
    maxUsers: ch.maxUsers,
    unreadCount: unreadByChannel.get(ch.id) ?? 0,
  }));

  return {
    communityId: community.id,
    slug: community.slug,
    name: community.name,
    iconUrl: community.iconUrl,
    memberCount: community.memberCount,
    isMember,
    isOwner,
    permissions,
    channels,
  };
}

export async function getCommunityChannel(
  communitySlug: string,
  channelSlug: string
): Promise<(CommunityChannelView & { communityId: string }) | null> {
  const ctx = await getCommunityServerContext(communitySlug);
  if (!ctx) return null;
  const ch = ctx.channels.find((c) => c.slug === channelSlug);
  if (!ch) return null;
  return { ...ch, communityId: ctx.communityId };
}

export async function getCommunityMembersForSidebar(
  communityId: string,
  take = 200
): Promise<CommunityMemberView[]> {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { creatorId: true },
  });
  if (!community) return [];

  const rows = await db.communityMember.findMany({
    where: { communityId },
    orderBy: [{ presence: "asc" }, { joinedAt: "asc" }],
    take,
    include: {
      memberRoles: {
        include: { role: { select: { id: true, name: true, type: true, color: true } } },
      },
    },
  });

  const userIds = rows.map((r) => r.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, name: true, image: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const u = byId.get(r.userId);
    return {
      id: r.id,
      userId: r.userId,
      username: u?.username ?? "unknown",
      name: u?.name ?? null,
      image: u?.image ?? null,
      nickname: r.nickname,
      presence: r.presence,
      roles: r.memberRoles.map((mr) => mr.role),
      isOwner: r.role === "owner" || community.creatorId === r.userId,
      joinedAt: r.joinedAt.toISOString(),
    };
  });
}

export async function updateCommunityPresence(
  communityId: string,
  presence: CommunityPresenceStatus
) {
  try {
    const user = await requireAuth();
    await db.communityMember.updateMany({
      where: { communityId, userId: user.id },
      data: { presence, lastSeenAt: new Date() },
    });
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function markCommunityChannelRead(channelId: string, lastMessageId?: string) {
  try {
    const user = await requireAuth();
    await db.communityChannelRead.upsert({
      where: { channelId_userId: { channelId, userId: user.id } },
      create: { channelId, userId: user.id, lastMessageId: lastMessageId ?? null },
      update: { lastReadAt: new Date(), lastMessageId: lastMessageId ?? null },
    });
    return { success: true as const };
  } catch {
    return { success: true as const };
  }
}

export async function createCommunityChannel(data: {
  communityId: string;
  type: CommunityChannelType;
  name: string;
  categoryId?: string;
}) {
  try {
    const user = await requireAuth();
    const community = await db.community.findUnique({
      where: { id: data.communityId },
      select: { id: true, slug: true, name: true, creatorId: true },
    });
    if (!community) return { error: "커뮤니티를 찾을 수 없습니다." };

    const isOwner = community.creatorId === user.id;
    const perms = await loadMemberPermissions(community.id, user.id, isOwner);
    if (!hasPermission(perms, "manageChannels")) {
      return { error: "채널을 만들 권한이 없습니다." };
    }

    const name = data.name.trim();
    if (!name) return { error: "채널 이름을 입력해 주세요." };

    const slug = name
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9가-힣-]/g, "")
      .slice(0, 32) || `ch-${Date.now().toString(36)}`;

    const maxPos = await db.communityChannel.aggregate({
      where: { communityId: community.id },
      _max: { position: true },
    });

    let chatRoomId: string | null = null;
    let voiceChannelId: string | null = null;

    if (data.type === "TEXT" || data.type === "ANNOUNCEMENT" || data.type === "QA") {
      const room = await db.chatRoom.create({
        data: {
          name: `${community.name} · ${name}`,
          type: "FANDOM",
          communityId: community.id,
          isPublic: true,
          createdById: user.id,
          members: { create: { userId: user.id, role: "owner" } },
        },
      });
      chatRoomId = room.id;
    }

    if (data.type === "VOICE" || data.type === "VIDEO" || data.type === "LIVE") {
      const voice = await db.voiceChannel.create({
        data: {
          name: `${community.name} · ${name}`,
          communityId: community.id,
          createdBy: user.id,
          allowCamera: data.type !== "VOICE",
          isLive: data.type === "LIVE",
        },
      });
      voiceChannelId = voice.id;
    }

    const channel = await db.communityChannel.create({
      data: {
        communityId: community.id,
        categoryId: data.categoryId ?? null,
        type: data.type,
        name,
        slug,
        position: (maxPos._max.position ?? 0) + 1,
        chatRoomId,
        voiceChannelId,
      },
      select: { id: true, slug: true },
    });

    revalidatePath(`/c/${community.slug}`);
    return { channel };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function reportCommunityContent(data: {
  communityId: string;
  targetType: "message" | "post" | "user";
  targetId: string;
  reason: string;
}) {
  try {
    const user = await requireAuth();
    const reason = data.reason.trim();
    if (!reason) return { error: "신고 사유를 입력해 주세요." };

    if (data.targetType === "post") {
      await db.report.create({
        data: {
          reporterId: user.id,
          targetType: "POST",
          targetId: data.targetId,
          postId: data.targetId,
          reason,
        },
      });
    } else if (data.targetType === "user") {
      await db.report.create({
        data: {
          reporterId: user.id,
          targetType: "USER",
          targetId: data.targetId,
          reportedUserId: data.targetId,
          reason,
        },
      });
    }
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}
