import { cache } from "react";
import { db } from "@/lib/db";
import { getCachedCurrentUser } from "@/lib/auth";
import { normalizeCommunitySlugParam } from "@/lib/community-slug";
import { ensureCommunityServerProvisioned } from "@/lib/community-server/provision";
import { ensureCommunityActivitiesChannel } from "@/lib/community-server/ensure-activities-channel";
import { guestPermissions, parsePermissions, defaultPermissionsForRole } from "@/lib/community-server/permissions";
import { permissionsFromMember } from "@/lib/community-server/member-permissions";
import { getPrimaryRoleType } from "@/lib/community-server/member-role-utils";
import type {
  CommunityChannelView,
  CommunityMemberView,
  CommunityServerContext,
  CommunityPermissions,
} from "@/lib/community-server/types";

/** 요청 단위 캐시 — layout + page가 같은 요청에서 중복 조회하지 않음 */
export const getCommunityServerContext = cache(
  async (slug: string): Promise<CommunityServerContext | null> => {
    const normalizedSlug = normalizeCommunitySlugParam(slug);
    if (!normalizedSlug) return null;

    const [user, community] = await Promise.all([
      getCachedCurrentUser(),
      db.community.findUnique({
        where: { slug: normalizedSlug },
        select: {
          id: true,
          slug: true,
          name: true,
          iconUrl: true,
          memberCount: true,
          creatorId: true,
          joinMode: true,
          isPublic: true,
        },
      }),
    ]);
    if (!community) return null;

    await ensureCommunityServerProvisioned(community.id);
    await ensureCommunityActivitiesChannel(community.id).catch(() => null);

    let isMember = false;
    let isOwner = false;
    let showWelcome = false;
    let permissions: CommunityPermissions = guestPermissions();

    const memberPromise = user
      ? db.communityMember.findUnique({
          where: { communityId_userId: { communityId: community.id, userId: user.id } },
          include: {
            memberRoles: {
              include: { role: { select: { permissions: true, type: true } } },
            },
          },
        })
      : Promise.resolve(null);

    const [member, channelsRaw] = await Promise.all([
      memberPromise,
      db.communityChannel.findMany({
        where: { communityId: community.id },
        orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
        include: { category: { select: { id: true, name: true } } },
      }),
    ]);

    if (user && member) {
      isMember = true;
      isOwner = community.creatorId === user.id || member.role === "owner";
      showWelcome = !member.welcomedAt;
      const fallback =
        member.memberRoles.length === 0
          ? await db.communityRole.findFirst({
              where: isOwner
                ? { communityId: community.id, type: "OWNER" }
                : { communityId: community.id, isDefault: true },
              select: { permissions: true },
            })
          : null;
      permissions = permissionsFromMember(
        member,
        isOwner,
        community.id,
        fallback ? parsePermissions(fallback.permissions) : undefined
      );
    } else if (user && community.creatorId === user.id) {
      isOwner = true;
      isMember = true;
      const ownerRole = await db.communityRole.findFirst({
        where: { communityId: community.id, type: "OWNER" },
        select: { permissions: true },
      });
      permissions = ownerRole
        ? parsePermissions(ownerRole.permissions)
        : defaultPermissionsForRole("OWNER");
    } else if (user) {
      permissions = guestPermissions();
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
      slowModeSec: ch.slowModeSec,
      isLocked: ch.isLocked,
      vipOnly: ch.vipOnly,
      unreadCount: 0,
    }));

    return {
      communityId: community.id,
      slug: community.slug,
      name: community.name,
      iconUrl: community.iconUrl,
      memberCount: community.memberCount,
      joinMode: community.joinMode,
      isPublic: community.isPublic,
      isMember,
      isOwner,
      isLoggedIn: !!user,
      permissions,
      channels,
      showWelcome,
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
      orderBy: [{ joinedAt: "asc" }],
      take,
      include: {
        memberRoles: {
          include: { role: { select: { id: true, name: true, type: true, color: true, position: true } } },
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
      const roles = r.memberRoles
        .map((mr) => mr.role)
        .sort((a, b) => a.position - b.position);
      const isOwner = r.role === "owner" || community.creatorId === r.userId;
      return {
        id: r.id,
        userId: r.userId,
        username: u?.username ?? "unknown",
        name: u?.name ?? null,
        image: u?.image ?? null,
        nickname: r.nickname,
        presence: r.presence,
        voiceActivity: r.voiceActivity,
        roles,
        primaryRoleType: getPrimaryRoleType(roles, isOwner),
        isOwner,
        joinedAt: r.joinedAt.toISOString(),
      };
    });
  }
);
