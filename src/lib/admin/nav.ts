import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Drama,
  CreditCard,
  TicketPercent,
  ShoppingBag,
  MessagesSquare,
  Radio,
  ShieldAlert,
  Megaphone,
  BarChart3,
  Settings,
  Gavel,
  Coins,
  Flower2,
  Landmark,
  Shield,
  KeyRound,
  ScrollText,
  Sparkles,
  Lock,
  History,
  Search,
} from "lucide-react";
import type { AdminPermission } from "@/lib/admin/permissions";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: AdminPermission;
};

export const ADMIN_PRIMARY_NAV: AdminNavItem[] = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/admin/users", label: "회원 관리", icon: Users, permission: "users" },
  { href: "/admin/creators", label: "크리에이터 관리", icon: Drama, permission: "creators" },
  { href: "/admin/settlements", label: "정산 관리", icon: CreditCard, permission: "settlements" },
  { href: "/admin/coupons", label: "쿠폰", icon: TicketPercent, permission: "coupons" },
  { href: "/admin/promotions", label: "프로모션", icon: Sparkles, permission: "coupons" },
  { href: "/admin/products", label: "상품 관리", icon: ShoppingBag, permission: "products" },
  { href: "/admin/communities", label: "커뮤니티 관리", icon: MessagesSquare, permission: "communities" },
  { href: "/admin/live", label: "라이브 관리", icon: Radio, permission: "live" },
  { href: "/admin/reports", label: "신고 관리", icon: ShieldAlert, permission: "reports" },
  { href: "/admin/ads", label: "광고 관리", icon: Megaphone, permission: "ads" },
  { href: "/admin/statistics", label: "통계", icon: BarChart3, permission: "statistics" },
  { href: "/admin/search", label: "검색 통계", icon: Search, permission: "statistics" },
  { href: "/admin/roles", label: "관리자 계정", icon: KeyRound, permission: "admins" },
  { href: "/admin/audit", label: "감사 로그", icon: ScrollText, permission: "audit" },
  { href: "/admin/security/logins", label: "로그인 기록", icon: History, permission: "audit" },
  { href: "/admin/settings/security", label: "보안 설정", icon: Lock, permission: "settings" },
  { href: "/admin/settings", label: "시스템 설정", icon: Settings, permission: "settings" },
];

export const ADMIN_LEGACY_NAV: AdminNavItem[] = [
  { href: "/admin/market", label: "MARKET 분쟁", icon: Gavel, permission: "legacy.ops" },
  { href: "/admin/finance", label: "매출 · 출금", icon: Landmark, permission: "legacy.ops" },
  { href: "/admin/economy", label: "APT 경제", icon: Coins, permission: "legacy.ops" },
  { href: "/admin/flowers", label: "Flower Gift", icon: Flower2, permission: "legacy.ops" },
  { href: "/admin/moderation", label: "위험도 대기열", icon: ShieldAlert, permission: "reports" },
  { href: "/admin/suspensions", label: "계정 제재", icon: Shield, permission: "reports" },
];

export function getAdminPageTitle(pathname: string): string {
  const all = [...ADMIN_PRIMARY_NAV, ...ADMIN_LEGACY_NAV];
  const exact = all.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const prefix = all
    .filter((item) => item.href !== "/admin" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return prefix?.label ?? "관리자";
}

export function filterNavByPermissions(
  items: AdminNavItem[],
  permissions: AdminPermission[]
): AdminNavItem[] {
  const set = new Set(permissions);
  return items.filter((item) => set.has(item.permission));
}
