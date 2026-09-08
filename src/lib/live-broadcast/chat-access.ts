import type { SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { tierRank } from "@/lib/tiers";
import {
  getEffectiveBroadcastRole,
  hasBroadcastPermission,
  requireBroadcastPermission,
  roleRank,
  type EffectiveBroadcastRole,
} from "@/lib/live-broadcast/permissions";

export async function isLiveChatBanned(channelId: string, userId: string): Promise<boolean> {
  const ban = await db.liveChatBan.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { id: true },
  });
  return !!ban;
}

export async function getActiveLiveChatTimeout(
  channelId: string,
  userId: string
): Promise<Date | null> {
  const row = await db.liveChatTimeout.findFirst({
    where: {
      channelId,
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true },
  });
  return row?.expiresAt ?? null;
}

export async function assertCanSendLiveChat(input: {
  channelId: string;
  userId: string;
  hostUserId: string;
}): Promise<{ ok: true; role: EffectiveBroadcastRole } | { ok: false; error: string }> {
  const { channelId, userId, hostUserId } = input;

  const role = await getEffectiveBroadcastRole(channelId, userId);
  if (hasBroadcastPermission(role, "chat.delete")) {
    return { ok: true, role };
  }

  if (await isLiveChatBanned(channelId, userId)) {
    return { ok: false, error: "이 방송에서 차단되어 채팅할 수 없습니다." };
  }

  const timeoutUntil = await getActiveLiveChatTimeout(channelId, userId);
  if (timeoutUntil) {
    const sec = Math.ceil((timeoutUntil.getTime() - Date.now()) / 1000);
    return { ok: false, error: `타임아웃 중입니다. ${sec}초 후에 다시 시도해 주세요.` };
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      chatFollowersOnly: true,
      chatSubscribersOnly: true,
      chatMinTierExempt: true,
    },
  });
  if (!channel) return { ok: false, error: "방송을 찾을 수 없습니다." };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { supportTierSent: true },
  });
  const tierExempt =
    channel.chatMinTierExempt &&
    user &&
    tierRank(user.supportTierSent) >= tierRank(channel.chatMinTierExempt);

  if (tierExempt) return { ok: true, role };

  if (channel.chatSubscribersOnly) {
    const sub = await db.subscription.findFirst({
      where: {
        subscriberId: userId,
        creatorId: hostUserId,
        status: "active",
        currentPeriodEnd: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!sub) {
      return { ok: false, error: "구독자만 채팅할 수 있습니다." };
    }
  }

  if (channel.chatFollowersOnly) {
    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: { followerId: userId, followingId: hostUserId },
      },
      select: { id: true },
    });
    if (!follow) {
      return { ok: false, error: "팔로워만 채팅할 수 있습니다." };
    }
  }

  return { ok: true, role };
}

export async function timeoutLiveChatUser(input: {
  channelId: string;
  actorId: string;
  targetUserId: string;
  durationSeconds: number;
}) {
  const perm = await requireBroadcastPermission(input.actorId, input.channelId, "chat.timeout");
  if (!perm.ok) return { error: perm.error };

  const channel = await db.voiceChannel.findUnique({
    where: { id: input.channelId },
    select: { createdBy: true },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다." };
  if (input.targetUserId === channel.createdBy) {
    return { error: "방송 소유자에게 타임아웃을 적용할 수 없습니다." };
  }

  const targetRole = await getEffectiveBroadcastRole(input.channelId, input.targetUserId);
  if (roleRank(targetRole) >= roleRank(perm.role)) {
    return { error: "자신보다 높거나 같은 역할의 사용자에게 타임아웃을 적용할 수 없습니다." };
  }

  const sec = Math.min(3600, Math.max(30, input.durationSeconds));
  const expiresAt = new Date(Date.now() + sec * 1000);

  await db.liveChatTimeout.create({
    data: {
      channelId: input.channelId,
      userId: input.targetUserId,
      timedOutBy: input.actorId,
      expiresAt,
    },
  });

  return { success: true as const, expiresAt: expiresAt.toISOString() };
}

export async function banLiveChatUser(input: {
  channelId: string;
  actorId: string;
  targetUserId: string;
  reason?: string;
}) {
  const perm = await requireBroadcastPermission(input.actorId, input.channelId, "chat.ban");
  if (!perm.ok) return { error: perm.error };

  const channel = await db.voiceChannel.findUnique({
    where: { id: input.channelId },
    select: { createdBy: true },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다." };
  if (input.targetUserId === channel.createdBy) {
    return { error: "방송 소유자를 차단할 수 없습니다." };
  }

  const targetRole = await getEffectiveBroadcastRole(input.channelId, input.targetUserId);
  if (roleRank(targetRole) >= roleRank(perm.role)) {
    return { error: "자신보다 높거나 같은 역할의 사용자를 차단할 수 없습니다." };
  }

  await db.liveChatBan.upsert({
    where: {
      channelId_userId: { channelId: input.channelId, userId: input.targetUserId },
    },
    create: {
      channelId: input.channelId,
      userId: input.targetUserId,
      bannedBy: input.actorId,
      reason: input.reason?.slice(0, 200) ?? null,
    },
    update: {
      bannedBy: input.actorId,
      reason: input.reason?.slice(0, 200) ?? null,
    },
  });

  return { success: true as const };
}

export async function unbanLiveChatUser(input: {
  channelId: string;
  actorId: string;
  targetUserId: string;
}) {
  const perm = await requireBroadcastPermission(input.actorId, input.channelId, "chat.unban");
  if (!perm.ok) return { error: perm.error };

  await db.liveChatBan.deleteMany({
    where: { channelId: input.channelId, userId: input.targetUserId },
  });

  return { success: true as const };
}

export async function listLiveChatBans(channelId: string) {
  const rows = await db.liveChatBan.findMany({
    where: { channelId },
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

export function meetsChatTierExempt(
  userTier: SupportTierLevel,
  exemptMin: SupportTierLevel | null | undefined
): boolean {
  if (!exemptMin) return false;
  return tierRank(userTier) >= tierRank(exemptMin);
}
