/**
 * 커뮤니티 RBAC — Discord-style 권한 계산
 *
 * 서버(커뮤니티) 단위:
 *   1. creatorId === userId → 허용
 *   2. administrator 권한 → 허용
 *   3. 역할 OR 병합(server-wide permissions)
 *
 * 채널 단위 (resolveChannelPermission):
 *   1. creatorId === userId → 허용
 *   2. administrator → 허용
 *   3. 유저 개인 override (allow → 허용, deny → 거부)
 *   4. 역할 override (하나라도 allow → 허용; allow 없이 deny만 → 거부)
 *   5. @everyone(기본 역할) override
 *   6. server-wide OR 병합
 */
import { cache } from "react";
import { db } from "@/lib/db";
import { loadMemberPermissions } from "@/lib/community-server/member-permissions";
import {
  hasAdministrator,
  hasPermission,
  parseOverrideFlags,
} from "@/lib/community-server/permissions";
import type { CommunityPermissionKey } from "@/lib/community-server/types";

/** Community.creatorId — 방 생성자 (불변 owner_id) */
export function isCommunityCreator(creatorId: string, userId: string): boolean {
  return creatorId === userId;
}

/** creatorId · legacy member.role · OWNER 역할 타입 통합 */
export async function isCommunityOwner(communityId: string, userId: string): Promise<boolean> {
  const [community, member] = await Promise.all([
    db.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true },
    }),
    db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: {
        role: true,
        memberRoles: { include: { role: { select: { type: true } } } },
      },
    }),
  ]);
  if (!community) return false;
  if (isCommunityCreator(community.creatorId, userId)) return true;
  if (member?.role === "owner") return true;
  return member?.memberRoles.some((mr) => mr.role.type === "OWNER") ?? false;
}

const loadChannelOverrides = cache(async (channelId: string) => {
  return db.communityChannelPermissionOverride.findMany({
    where: { channelId },
    select: { targetType: true, targetId: true, allow: true, deny: true },
  });
});

function overrideAllows(
  allow: unknown,
  deny: unknown,
  permission: CommunityPermissionKey
): "allow" | "deny" | "neutral" {
  const allowFlags = parseOverrideFlags(allow);
  const denyFlags = parseOverrideFlags(deny);
  if (denyFlags[permission]) return "deny";
  if (allowFlags[permission]) return "allow";
  return "neutral";
}

/** 서버 단위 권한 (채널 override 미적용) */
export async function resolveCommunityPermission(
  communityId: string,
  userId: string,
  permission: CommunityPermissionKey
): Promise<boolean> {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { creatorId: true },
  });
  if (!community) return false;

  if (isCommunityCreator(community.creatorId, userId)) return true;

  const isOwner = await isCommunityOwner(communityId, userId);
  const serverPerms = await loadMemberPermissions(communityId, userId, isOwner);
  if (hasAdministrator(serverPerms)) return true;

  const memberForAdmin = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { memberRoles: { include: { role: { select: { type: true } } } } },
  });
  if (memberForAdmin?.memberRoles.some((mr) => mr.role.type === "ADMIN")) return true;

  return hasPermission(serverPerms, permission);
}

export type ChannelPermissionContext = {
  communityId: string;
  channelId: string;
  userId: string;
  permission: CommunityPermissionKey;
  /** isLocked — sendMessages에 대한 암시적 거부 (mod/administrator/override allow 예외) */
  channelLocked?: boolean;
};

/** 채널 단위 권한 (6단계 알고리즘) */
export async function resolveChannelPermission(ctx: ChannelPermissionContext): Promise<boolean> {
  const { communityId, channelId, userId, permission, channelLocked } = ctx;

  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { creatorId: true },
  });
  if (!community) return false;

  if (isCommunityCreator(community.creatorId, userId)) return true;

  const isOwner = await isCommunityOwner(communityId, userId);
  const serverPerms = await loadMemberPermissions(communityId, userId, isOwner);

  if (hasAdministrator(serverPerms)) return true;

  const memberForAdmin = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { memberRoles: { include: { role: { select: { type: true } } } } },
  });
  if (memberForAdmin?.memberRoles.some((mr) => mr.role.type === "ADMIN")) return true;

  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: {
      userId: true,
      memberRoles: { select: { roleId: true } },
    },
  });
  if (!member) return false;

  const roleIds = new Set(member.memberRoles.map((mr) => mr.roleId));
  const overrides = await loadChannelOverrides(channelId);

  const userOverride = overrides.find(
    (o) => o.targetType === "USER" && o.targetId === userId
  );
  if (userOverride) {
    const verdict = overrideAllows(userOverride.allow, userOverride.deny, permission);
    if (verdict === "allow") return true;
    if (verdict === "deny") return false;
  }

  const defaultRole = await db.communityRole.findFirst({
    where: { communityId, isDefault: true },
    select: { id: true },
  });
  const everyoneRoleId = defaultRole?.id;

  const roleOverrides = overrides.filter(
    (o) =>
      o.targetType === "ROLE" &&
      roleIds.has(o.targetId) &&
      o.targetId !== everyoneRoleId
  );

  let roleAllow = false;
  let roleDenyWithoutAllow = false;
  for (const ov of roleOverrides) {
    const allowFlags = parseOverrideFlags(ov.allow);
    const denyFlags = parseOverrideFlags(ov.deny);
    if (allowFlags[permission]) roleAllow = true;
    if (denyFlags[permission] && !allowFlags[permission]) roleDenyWithoutAllow = true;
  }
  if (roleAllow) return true;
  if (roleDenyWithoutAllow) return false;

  if (everyoneRoleId) {
    const everyoneOverride = overrides.find(
      (o) => o.targetType === "ROLE" && o.targetId === everyoneRoleId
    );
    if (everyoneOverride) {
      const verdict = overrideAllows(
        everyoneOverride.allow,
        everyoneOverride.deny,
        permission
      );
      if (verdict === "allow") return true;
      if (verdict === "deny") return false;
    }
  }

  if (
    channelLocked &&
    permission === "sendMessages" &&
    !hasPermission(serverPerms, "moderateChat") &&
    !hasPermission(serverPerms, "manageChannels")
  ) {
    return false;
  }

  return hasPermission(serverPerms, permission);
}
