"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";
import type { CommunityChannelType, CommunityPresenceStatus } from "@prisma/client";
import { prismaErrorMessage } from "@/lib/prisma-user-error";

const PROTECTED_TYPES: CommunityChannelType[] = ["POSTS", "MEMBERS", "SETTINGS"];

async function getCommunityPerms(communityId: string, userId: string) {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { id: true, slug: true, name: true, creatorId: true },
  });
  if (!community) return null;
  const isOwner = community.creatorId === userId;
  const perms = await loadMemberPermissions(communityId, userId, isOwner);
  return { community, perms, isOwner };
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
    const ctx = await getCommunityPerms(data.communityId, user.id);
    if (!ctx) return { error: "커뮤니티를 찾을 수 없습니다." };
    if (!hasPermission(ctx.perms, "createChannel") && !hasPermission(ctx.perms, "manageChannels")) {
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
      where: { communityId: ctx.community.id },
      _max: { position: true },
    });

    let chatRoomId: string | null = null;
    let voiceChannelId: string | null = null;

    if (data.type === "TEXT" || data.type === "ANNOUNCEMENT" || data.type === "QA") {
      const room = await db.chatRoom.create({
        data: {
          name: `${ctx.community.name} · ${name}`,
          type: "FANDOM",
          communityId: ctx.community.id,
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
          name: `${ctx.community.name} · ${name}`,
          communityId: ctx.community.id,
          createdBy: user.id,
          allowCamera: data.type !== "VOICE",
          isLive: data.type === "LIVE",
        },
      });
      voiceChannelId = voice.id;
    }

    const channel = await db.communityChannel.create({
      data: {
        communityId: ctx.community.id,
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

    revalidatePath(`/c/${ctx.community.slug}`);
    return { channel };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function updateCommunityChannel(
  channelId: string,
  data: {
    name?: string;
    topic?: string;
    slowModeSec?: number;
    isLocked?: boolean;
    vipOnly?: boolean;
    maxUsers?: number | null;
  }
) {
  try {
    const user = await requireAuth();
    const channel = await db.communityChannel.findUnique({
      where: { id: channelId },
      select: { id: true, communityId: true, type: true, slug: true, name: true },
    });
    if (!channel) return { error: "채널을 찾을 수 없습니다." };

    const ctx = await getCommunityPerms(channel.communityId, user.id);
    if (!ctx) return { error: "커뮤니티를 찾을 수 없습니다." };

    const canRename = hasPermission(ctx.perms, "renameChannel") || hasPermission(ctx.perms, "manageChannels");
    const canSlow = hasPermission(ctx.perms, "setSlowMode") || hasPermission(ctx.perms, "manageChannels");
    const canLock = hasPermission(ctx.perms, "lockChannel") || hasPermission(ctx.perms, "manageChannels");

    const patch: {
      name?: string;
      slug?: string;
      topic?: string | null;
      slowModeSec?: number;
      isLocked?: boolean;
      vipOnly?: boolean;
      maxUsers?: number | null;
    } = {};

    if (data.name !== undefined) {
      if (!canRename) return { error: "채널 이름 변경 권한이 없습니다." };
      const name = data.name.trim();
      if (!name) return { error: "채널 이름을 입력해 주세요." };
      patch.name = name;
      patch.slug =
        name
          .toLowerCase()
          .replace(/[\s_]+/g, "-")
          .replace(/[^a-z0-9가-힣-]/g, "")
          .slice(0, 32) || channel.slug;
    }
    if (data.topic !== undefined && canRename) {
      patch.topic = data.topic.trim() || null;
    }
    if (data.slowModeSec !== undefined) {
      if (!canSlow) return { error: "슬로우 모드 설정 권한이 없습니다." };
      patch.slowModeSec = Math.min(21600, Math.max(0, data.slowModeSec));
    }
    if (data.isLocked !== undefined) {
      if (!canLock) return { error: "채널 잠금 권한이 없습니다." };
      patch.isLocked = data.isLocked;
    }
    if (data.vipOnly !== undefined && canRename) {
      patch.vipOnly = data.vipOnly;
    }
    if (data.maxUsers !== undefined && canRename) {
      patch.maxUsers = data.maxUsers;
    }

    if (Object.keys(patch).length === 0) return { error: "변경할 내용이 없습니다." };

    await db.communityChannel.update({ where: { id: channelId }, data: patch });
    revalidatePath(`/c/${ctx.community.slug}`);
    return { success: true as const, slug: patch.slug ?? channel.slug };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function deleteCommunityChannel(channelId: string) {
  try {
    const user = await requireAuth();
    const channel = await db.communityChannel.findUnique({
      where: { id: channelId },
      select: { id: true, communityId: true, type: true, isDefault: true, chatRoomId: true, voiceChannelId: true },
    });
    if (!channel) return { error: "채널을 찾을 수 없습니다." };
    if (channel.isDefault || PROTECTED_TYPES.includes(channel.type)) {
      return { error: "이 채널은 삭제할 수 없습니다." };
    }

    const ctx = await getCommunityPerms(channel.communityId, user.id);
    if (!ctx) return { error: "커뮤니티를 찾을 수 없습니다." };
    if (!hasPermission(ctx.perms, "deleteChannel") && !hasPermission(ctx.perms, "manageChannels")) {
      return { error: "채널 삭제 권한이 없습니다." };
    }

    await db.communityChannel.delete({ where: { id: channelId } });
    if (channel.chatRoomId) {
      await db.chatRoom.delete({ where: { id: channel.chatRoomId } }).catch(() => undefined);
    }
    if (channel.voiceChannelId) {
      await db.voiceChannel.delete({ where: { id: channel.voiceChannelId } }).catch(() => undefined);
    }

    revalidatePath(`/c/${ctx.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function reorderCommunityChannels(communityId: string, orderedIds: string[]) {
  try {
    const user = await requireAuth();
    const ctx = await getCommunityPerms(communityId, user.id);
    if (!ctx) return { error: "커뮤니티를 찾을 수 없습니다." };
    if (!hasPermission(ctx.perms, "reorderChannels") && !hasPermission(ctx.perms, "manageChannels")) {
      return { error: "채널 순서 변경 권한이 없습니다." };
    }

    await db.$transaction(
      orderedIds.map((id, index) =>
        db.communityChannel.updateMany({
          where: { id, communityId },
          data: { position: index },
        })
      )
    );

    revalidatePath(`/c/${ctx.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function createChannelCategory(communityId: string, name: string) {
  try {
    const user = await requireAuth();
    const ctx = await getCommunityPerms(communityId, user.id);
    if (!ctx) return { error: "커뮤니티를 찾을 수 없습니다." };
    if (!hasPermission(ctx.perms, "editCategory") && !hasPermission(ctx.perms, "manageChannels")) {
      return { error: "권한이 없습니다." };
    }
    const trimmed = name.trim();
    if (!trimmed) return { error: "카테고리 이름을 입력해 주세요." };
    const maxPos = await db.communityChannelCategory.aggregate({
      where: { communityId },
      _max: { position: true },
    });
    const cat = await db.communityChannelCategory.create({
      data: { communityId, name: trimmed, position: (maxPos._max.position ?? 0) + 1 },
      select: { id: true, name: true },
    });
    revalidatePath(`/c/${ctx.community.slug}`);
    return { category: cat };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function deleteChannelCategory(categoryId: string) {
  try {
    const user = await requireAuth();
    const cat = await db.communityChannelCategory.findUnique({
      where: { id: categoryId },
      include: { community: { select: { id: true, slug: true } } },
    });
    if (!cat) return { error: "카테고리를 찾을 수 없습니다." };
    const ctx = await getCommunityPerms(cat.communityId, user.id);
    if (!ctx) return { error: "권한이 없습니다." };
    if (!hasPermission(ctx.perms, "editCategory") && !hasPermission(ctx.perms, "manageChannels")) {
      return { error: "권한이 없습니다." };
    }
    await db.communityChannel.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    });
    await db.communityChannelCategory.delete({ where: { id: categoryId } });
    revalidatePath(`/c/${cat.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function getCommunityChannelsForManage(communityId: string) {
  try {
    const user = await requireAuth();
    const ctx = await getCommunityPerms(communityId, user.id);
    if (!ctx) return { channels: [] };
    if (!hasPermission(ctx.perms, "manageChannels")) return { channels: [] };

    const channels = await db.communityChannel.findMany({
      where: { communityId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        topic: true,
        position: true,
        isDefault: true,
        slowModeSec: true,
        isLocked: true,
        vipOnly: true,
        maxUsers: true,
        categoryId: true,
      },
    });
    return { channels };
  } catch {
    return { channels: [] };
  }
}

export async function getChannelCategories(communityId: string) {
  try {
    const cats = await db.communityChannelCategory.findMany({
      where: { communityId },
      orderBy: { position: "asc" },
      select: { id: true, name: true, position: true },
    });
    return { categories: cats };
  } catch {
    return { categories: [] };
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
