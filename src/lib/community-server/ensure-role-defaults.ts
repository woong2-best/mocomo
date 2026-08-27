import { db } from "@/lib/db";
import type { CommunityPermissionKey } from "@/lib/community-server/types";
import { defaultPermissionsForRole, parsePermissions } from "@/lib/community-server/permissions";

const MODERATOR_CHANNEL_KEYS: CommunityPermissionKey[] = [
  "editBanner",
  "createChannel",
  "renameChannel",
  "reorderChannels",
  "lockChannel",
  "setSlowMode",
];

const syncedCommunities = new Set<string>();

/** 기존 커뮤니티 Moderator 역할에 채널 권한 기본값 보강 (관리자가 끈 권한은 건드리지 않음) */
export async function ensureCommunityRoleDefaults(communityId: string) {
  if (syncedCommunities.has(communityId)) return;
  syncedCommunities.add(communityId);

  const moderator = await db.communityRole.findFirst({
    where: { communityId, type: "MODERATOR" },
    select: { id: true, permissions: true },
  });
  if (!moderator) return;

  const defaults = defaultPermissionsForRole("MODERATOR");
  const current = parsePermissions(moderator.permissions);
  const next = { ...current };
  let changed = false;

  for (const key of MODERATOR_CHANNEL_KEYS) {
    if (defaults[key] && !current[key]) {
      next[key] = true;
      changed = true;
    }
  }

  if (changed) {
    await db.communityRole.update({
      where: { id: moderator.id },
      data: { permissions: next },
    });
  }
}
