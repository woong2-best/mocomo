import type { UserRole } from "@prisma/client";

/** Admin CMS 권한 키 — 메뉴·액션 단위 */
export type AdminPermission =
  | "dashboard"
  | "users"
  | "users.write"
  | "creators"
  | "settlements"
  | "coupons"
  | "coupons.write"
  | "coupons.assign"
  | "coupons.delete"
  | "products"
  | "communities"
  | "live"
  | "reports"
  | "ads"
  | "statistics"
  | "settings"
  | "admins"
  | "audit"
  | "legacy.ops";

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  "dashboard",
  "users",
  "users.write",
  "creators",
  "settlements",
  "coupons",
  "coupons.write",
  "coupons.assign",
  "coupons.delete",
  "products",
  "communities",
  "live",
  "reports",
  "ads",
  "statistics",
  "settings",
  "admins",
  "audit",
  "legacy.ops",
];

/** 요청 역할 → 기존 UserRole 매핑 (OWNER는 내부 최고) */
export const ADMIN_CMS_ROLES: UserRole[] = [
  "MARKETING",
  "CUSTOMER_SUPPORT",
  "MODERATOR",
  "SETTLEMENT_MANAGER",
  "SENIOR_MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
  "OWNER",
];

const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  OWNER: ALL_ADMIN_PERMISSIONS,
  SUPER_ADMIN: ALL_ADMIN_PERMISSIONS.filter((p) => p !== "admins"),
  ADMIN: ALL_ADMIN_PERMISSIONS.filter((p) => p !== "admins"),
  SENIOR_MODERATOR: [
    "dashboard",
    "users",
    "users.write",
    "reports",
    "communities",
    "live",
    "audit",
  ],
  MODERATOR: ["dashboard", "reports", "communities", "live"],
  SETTLEMENT_MANAGER: ["dashboard", "settlements", "statistics", "audit"],
  CUSTOMER_SUPPORT: ["dashboard", "users", "reports", "audit", "coupons"],
  MARKETING: ["dashboard", "coupons", "coupons.write", "coupons.assign", "ads", "statistics"],
};

export function isAdminCmsRole(role: string): boolean {
  return ADMIN_CMS_ROLES.includes(role as UserRole);
}

export function permissionsForRole(role: string): AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasAdminPermission(role: string, permission: AdminPermission): boolean {
  return permissionsForRole(role).includes(permission);
}

export function pathPermission(pathname: string): AdminPermission | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/creators")) return "creators";
  if (pathname.startsWith("/admin/settlements") || pathname.startsWith("/admin/finance")) {
    return "settlements";
  }
  if (pathname.startsWith("/admin/coupons") || pathname.startsWith("/admin/promotions")) {
    return "coupons";
  }  if (pathname.startsWith("/admin/products")) return "products";
  if (pathname.startsWith("/admin/communities")) return "communities";
  if (pathname.startsWith("/admin/live")) return "live";
  if (
    pathname.startsWith("/admin/reports") ||
    pathname.startsWith("/admin/moderation") ||
    pathname.startsWith("/admin/suspensions") ||
    pathname.startsWith("/admin/watermark")
  ) {
    return "reports";
  }
  if (pathname.startsWith("/admin/ads")) return "ads";
  if (pathname.startsWith("/admin/statistics")) return "statistics";
  if (pathname.startsWith("/admin/search")) return "statistics";
  if (pathname.startsWith("/admin/settings")) return "settings";
  if (pathname.startsWith("/admin/security")) return "audit";
  if (pathname.startsWith("/admin/roles") || pathname.startsWith("/admin/admins")) return "admins";
  if (pathname.startsWith("/admin/audit")) return "audit";
  if (
    pathname.startsWith("/admin/market") ||
    pathname.startsWith("/admin/economy") ||
    pathname.startsWith("/admin/flowers") ||
    pathname.startsWith("/admin/used-market")
  ) {
    return "legacy.ops";
  }
  return "dashboard";
}

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  USER: "일반",
  VERIFIED: "인증",
  MARKETING: "마케팅",
  CUSTOMER_SUPPORT: "고객지원",
  MODERATOR: "모더레이터",
  SETTLEMENT_MANAGER: "정산 담당",
  SENIOR_MODERATOR: "시니어 모더레이터",
  ADMIN: "관리자",
  SUPER_ADMIN: "최고 관리자",
  OWNER: "소유자",
};
