"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { resolveCommunityPermission } from "@/lib/community-server/access-resolver";
import { parseOverrideFlags } from "@/lib/community-server/permissions";
import type {
  ChannelPermissionOverrideFlags,
  CommunityPermissionKey,
} from "@/lib/community-server/types";
import { prismaErrorMessage } from "@/lib/prisma-user-error";

function toOverrideJson(flags: ChannelPermissionOverrideFlags): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(flags)) {
    if (val === true) out[key] = true;
  }
  return out;
}

export async function upsertChannelPermissionOverride(input: {
  channelId: string;
  targetType: "ROLE" | "USER";
  targetId: string;
  allow?: ChannelPermissionOverrideFlags;
  deny?: ChannelPermissionOverrideFlags;
}) {
  try {
    const user = await requireAuth();
    const channel = await db.communityChannel.findUnique({
      where: { id: input.channelId },
      select: { id: true, communityId: true, community: { select: { slug: true } } },
    });
    if (!channel) return { error: "채널을 찾을 수 없습니다." };

    const canManage = await resolveCommunityPermission(
      channel.communityId,
      user.id,
      "manageChannels"
    );
    if (!canManage) return { error: "채널 권한 설정 권한이 없습니다." };

    await db.communityChannelPermissionOverride.upsert({
      where: {
        channelId_targetType_targetId: {
          channelId: input.channelId,
          targetType: input.targetType,
          targetId: input.targetId,
        },
      },
      create: {
        channelId: input.channelId,
        targetType: input.targetType,
        targetId: input.targetId,
        allow: toOverrideJson(input.allow ?? {}),
        deny: toOverrideJson(input.deny ?? {}),
      },
      update: {
        allow: toOverrideJson(input.allow ?? {}),
        deny: toOverrideJson(input.deny ?? {}),
      },
    });

    revalidatePath(`/c/${channel.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function deleteChannelPermissionOverride(overrideId: string) {
  try {
    const user = await requireAuth();
    const row = await db.communityChannelPermissionOverride.findUnique({
      where: { id: overrideId },
      include: { channel: { select: { communityId: true, community: { select: { slug: true } } } } },
    });
    if (!row) return { error: "덮어쓰기를 찾을 수 없습니다." };

    const canManage = await resolveCommunityPermission(
      row.channel.communityId,
      user.id,
      "manageChannels"
    );
    if (!canManage) return { error: "채널 권한 설정 권한이 없습니다." };

    await db.communityChannelPermissionOverride.delete({ where: { id: overrideId } });
    revalidatePath(`/c/${row.channel.community.slug}`);
    return { success: true as const };
  } catch (e) {
    return { error: prismaErrorMessage(e) };
  }
}

export async function getChannelPermissionOverrides(channelId: string) {
  const user = await requireAuth();
  const channel = await db.communityChannel.findUnique({
    where: { id: channelId },
    select: { communityId: true },
  });
  if (!channel) return [];

  const canManage = await resolveCommunityPermission(
    channel.communityId,
    user.id,
    "manageChannels"
  );
  if (!canManage) return [];

  return db.communityChannelPermissionOverride.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getChannelPermissionManageBundle(channelId: string) {
  const user = await requireAuth();
  const channel = await db.communityChannel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true, communityId: true },
  });
  if (!channel) return { error: "채널을 찾을 수 없습니다." as const };

  const canManage = await resolveCommunityPermission(
    channel.communityId,
    user.id,
    "manageChannels"
  );
  if (!canManage) return { error: "채널 권한 설정 권한이 없습니다." as const };

  const [overrides, roles] = await Promise.all([
    db.communityChannelPermissionOverride.findMany({
      where: { channelId },
      orderBy: { createdAt: "asc" },
    }),
    db.communityRole.findMany({
      where: { communityId: channel.communityId },
      orderBy: { position: "asc" },
      select: { id: true, name: true, type: true, isDefault: true },
    }),
  ]);

  return {
    channel: { id: channel.id, name: channel.name },
    overrides: overrides.map((o) => ({
      id: o.id,
      targetType: o.targetType as "ROLE" | "USER",
      targetId: o.targetId,
      allow: parseOverrideFlags(o.allow),
      deny: parseOverrideFlags(o.deny),
    })),
    roles,
  };
}
