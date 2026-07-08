"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  defaultPermissionsForRole,
  hasPermission,
  parsePermissions,
  mergePermissions,
} from "@/lib/community-server/permissions";
import type { CommunityChannelType, CommunityPresenceStatus } from "@prisma/client";
import { prismaErrorMessage } from "@/lib/prisma-user-error";

async function loadMemberPermissions(
  communityId: string,
  userId: string,
  isOwner: boolean
) {
  if (isOwner) return defaultPermissionsForRole("OWNER");
  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    include: {
      memberRoles: {
        include: { role: { select: { permissions: true, type: true } } },
      },
    },
  });
  if (!member) return defaultPermissionsForRole("MEMBER");
  const fromRoles = member.memberRoles.map((mr) => parsePermissions(mr.role.permissions));
  if (fromRoles.length === 0) {
    return member.role === "owner"
      ? defaultPermissionsForRole("OWNER")
      : defaultPermissionsForRole("MEMBER");
  }
  return mergePermissions(fromRoles);
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

    const slug =
      name
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
