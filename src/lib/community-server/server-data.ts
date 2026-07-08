import { cache } from "react";
import { db } from "@/lib/db";
import { getCachedCurrentUser } from "@/lib/auth";
import { normalizeCommunitySlugParam } from "@/lib/community-slug";
import { ensureCommunityServerProvisioned } from "@/lib/community-server/provision";
import {
  mergePermissions,
  parsePermissions,
  defaultPermissionsForRole,
} from "@/lib/community-server/permissions";
import type {
  CommunityChannelView,
  CommunityMemberView,
  CommunityPermissions,
  CommunityServerContext,
} from "@/lib/community-server/types";

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
  if (!member) return defaultPermissionsForRole("MEMBER");

  const fromRoles = member.memberRoles.map((mr) => parsePermissions(mr.role.permissions));
  if (fromRoles.length === 0) {
    return member.role === "owner"
      ? defaultPermissionsForRole("OWNER")
      : defaultPermissionsForRole("MEMBER");
  }
  return mergePermissions(fromRoles);
}

/** 요청 단위 캐시 — layout + page가 같은 요청에서 중복 조회하지 않음 */
export const getCommunityServerContext = cache(
  async (slug: string): Promise<CommunityServerContext | null> => {
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

    const [permissions, channelsRaw] = await Promise.all([
      user
        ? loadMemberPermissions(community.id, user.id, isOwner)
        : Promise.resolve(defaultPermissionsForRole("MEMBER")),
      db.communityChannel.findMany({
        where: { communityId: community.id },
        orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
        include: { category: { select: { id: true, name: true } } },
      }),
    ]);

    // 미읽음 카운트는 채널 전환 임계 경로에서 제외 (사이드바는 0으로 시작하고 클라에서 보강 가능)
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
      unreadCount: 0,
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
);

export const getCommunityChannelCached = cache(
  async (communitySlug: string, channelSlug: string) => {
    const ctx = await getCommunityServerContext(communitySlug);
    if (!ctx) return null;
    const ch = ctx.channels.find((c) => c.slug === channelSlug);
    if (!ch) return null;
    return { ...ch, communityId: ctx.communityId };
  }
);

export const getCommunityMembersForSidebar = cache(
  async (communityId: string, take = 80): Promise<CommunityMemberView[]> => {
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

    const users = await db.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
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
);
