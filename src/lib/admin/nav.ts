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
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 아직 기능 미구현 — UI만 */
  stub?: boolean;
};

/** 1차 메뉴 — 확장 시 여기에 항목만 추가 */
export const ADMIN_PRIMARY_NAV: AdminNavItem[] = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/users", label: "회원 관리", icon: Users, stub: true },
  { href: "/admin/creators", label: "크리에이터 관리", icon: Drama, stub: true },
  { href: "/admin/settlements", label: "정산 관리", icon: CreditCard, stub: true },
  { href: "/admin/coupons", label: "쿠폰 / 프로모션", icon: TicketPercent, stub: true },
  { href: "/admin/products", label: "상품 관리", icon: ShoppingBag, stub: true },
  { href: "/admin/communities", label: "커뮤니티 관리", icon: MessagesSquare, stub: true },
  { href: "/admin/live", label: "라이브 관리", icon: Radio, stub: true },
  { href: "/admin/reports", label: "신고 관리", icon: ShieldAlert, stub: true },
  { href: "/admin/ads", label: "광고 관리", icon: Megaphone, stub: true },
  { href: "/admin/statistics", label: "통계", icon: BarChart3, stub: true },
  { href: "/admin/settings", label: "시스템 설정", icon: Settings, stub: true },
];

/** 기존 운영 도구 (이미 동작하는 화면) — 사이드바 하단 */
export const ADMIN_LEGACY_NAV: AdminNavItem[] = [
  { href: "/admin/market", label: "MARKET 분쟁", icon: Gavel },
  { href: "/admin/finance", label: "매출 · 출금", icon: Landmark },
  { href: "/admin/economy", label: "APT 경제", icon: Coins },
  { href: "/admin/flowers", label: "Flower Gift", icon: Flower2 },
  { href: "/admin/moderation", label: "위험도 대기열", icon: ShieldAlert },
  { href: "/admin/suspensions", label: "계정 제재", icon: Shield },
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
