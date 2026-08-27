import type { CommunityRoleType } from "@prisma/client";
import type { CommunityPermissionKey, CommunityPermissions } from "./types";
import { RBAC_PERMISSION_KEYS, RBAC_LABELS, rbacDefaultsForRole } from "./rbac-defaults";

export const ALL_PERMISSION_KEYS = RBAC_PERMISSION_KEYS;
export const PERMISSION_LABELS = RBAC_LABELS;

const GUEST_PERMS: CommunityPermissions = Object.fromEntries(
  RBAC_PERMISSION_KEYS.map((k) => [k, false])
) as CommunityPermissions;

export function defaultPermissionsForRole(type: CommunityRoleType): CommunityPermissions {
  return { ...rbacDefaultsForRole(type) };
}

export function parsePermissions(json: unknown): CommunityPermissions {
  const base = { ...GUEST_PERMS };
  if (!json || typeof json !== "object") return base;
  for (const key of RBAC_PERMISSION_KEYS) {
    const val = (json as Record<string, unknown>)[key];
    if (typeof val === "boolean") base[key] = val;
  }
  return base;
}

/** 채널 override allow/deny JSON → 플래그 맵 */
export function parseOverrideFlags(json: unknown): Partial<Record<CommunityPermissionKey, boolean>> {
  const flags: Partial<Record<CommunityPermissionKey, boolean>> = {};
  if (!json || typeof json !== "object") return flags;
  for (const key of RBAC_PERMISSION_KEYS) {
    const val = (json as Record<string, unknown>)[key];
    if (val === true) flags[key] = true;
  }
  return flags;
}

export function hasAdministrator(perms: CommunityPermissions): boolean {
  return perms.administrator === true;
}

export function mergePermissions(roles: CommunityPermissions[]): CommunityPermissions {
  const merged = { ...GUEST_PERMS };
  for (const role of roles) {
    for (const key of RBAC_PERMISSION_KEYS) {
      if (role[key]) merged[key] = true;
    }
  }
  return merged;
}

export function hasPermission(perms: CommunityPermissions, key: CommunityPermissionKey): boolean {
  return perms[key] === true;
}

export function guestPermissions(): CommunityPermissions {
  return { ...GUEST_PERMS };
}
