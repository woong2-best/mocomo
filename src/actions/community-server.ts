"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import { hasPermission } from "@/lib/community-server/permissions";
import type { CommunityChannelType, CommunityPresenceStatus } from "@prisma/client";
import { prismaErrorMessage } from "@/lib/prisma-user-error";

const PROTECTED_TYPES: CommunityChannelType[] = ["POSTS", "MEMBERS", "SETTINGS"];
const REMOVED_CHANNEL_TYPES: CommunityChannelType[] = ["VOICE", "VIDEO", "LIVE"];

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
    if (!ctx) return { error: "actions.s1foa8q5" };
    if (!hasPermission(ctx.perms, "createChannel") && !hasPermission(ctx.perms, "manageChannels")) {
      return { error: "actions.s13gx6zr" };
    }

    const name = data.name.trim();
    if (!name) return { error: "actions.s1q2haiq" };
    if (REMOVED_CHANNEL_TYPES.includes(data.type)) {
      return { error: "actions.s1wqcdzx" };
    }

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

    const channel = await db.communityChannel.create({
      data: {
        communityId: ctx.community.id,
        categoryId: data.categoryId ?? null,
        type: data.type,
        name,
        slug,
        position: (maxPos._max.position ?? 0) + 1,
        chatRoomId,
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
    if (!channel) return { error: "actions.s8fxex5" };

    const ctx = await getCommunityPerms(channel.communityId, user.id);
    if (!ctx) return { error: "actions.s1foa8q5" };

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
      if (!canRename) return { error: "actions.s1ga7lcw" };
      const name = data.name.trim();
      if (!name) return { error: "actions.s1q2haiq" };
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
      if (!canSlow) return { error: "actions.s1tab884" };
      patch.slowModeSec = Math.min(21600, Math.max(0, data.slowModeSec));
    }
    if (data.isLocked !== undefined) {
      if (!canLock) return { error: "actions.s1ua5icj" };
      patch.isLocked = data.isLocked;
    }
    if (data.vipOnly !== undefined && canRename) {
      patch.vipOnly = data.vipOnly;
    }
    if (data.maxUsers !== undefined && canRename) {
      patch.maxUsers = data.maxUsers;
    }

    if (Object.keys(patch).length === 0) return { error: "actions.sg2x49x" };

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
    if (!channel) return { error: "actions.s8fxex5" };
    if (channel.isDefault || PROTECTED_TYPES.includes(channel.type)) {
      return { error: "actions.s4athkk" };
    }

    const ctx = await getCommunityPerms(channel.communityId, user.id);
    if (!ctx) return { error: "actions.s1foa8q5" };
    if (!hasPermission(ctx.perms, "deleteChannel") && !hasPermission(ctx.perms, "manageChannels")) {
      return { error: "actions.sn546q2" };
    }

    await db.communityChannel.delete({ where: { id: channelId } });
    if (channel.chatRoomId) {
      await db.chatRoom.delete({ where: { id: channel.chatRoomId } }).catch(() => undefined);
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
    if (!ctx) return { error: "actions.s1foa8q5" };
    if (!hasPermission(ctx.perms, "reorderChannels") && !hasPermission(ctx.perms, "manageChannels")) {
      return { error: "actions.s1g77t2o" };
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
    if (!ctx) return { error: "actions.s1foa8q5" };
    if (!hasPermission(ctx.perms, "editCategory") && !hasPermission(ctx.perms, "manageChannels")) {
      return { error: "actions.st3onev" };
    }
    const trimmed = name.trim();
    if (!trimmed) return { error: "actions.s4m55m2" };
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
    if (!cat) return { error: "actions.s1nb5vmx" };
    const ctx = await getCommunityPerms(cat.communityId, user.id);
    if (!ctx) return { error: "actions.st3onev" };
    if (!hasPermission(ctx.perms, "editCategory") && !hasPermission(ctx.perms, "manageChannels")) {
      return { error: "actions.st3onev" };
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
    if (!reason) return { error: "actions.s1nfd3zu" };

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
