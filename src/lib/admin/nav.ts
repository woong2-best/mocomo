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
  Flower2,
  Landmark,
  Shield,
  KeyRound,
  ScrollText,
  Sparkles,
  Lock,
  History,
  Search,
  Globe,
  Fingerprint,
  MapPin,
} from "lucide-react";
import type { AdminPermission } from "@/lib/admin/permissions";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: AdminPermission;
};

export const ADMIN_PRIMARY_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/admin/users", label: "Members", icon: Users, permission: "users" },
  { href: "/admin/creators", label: "Creators", icon: Drama, permission: "creators" },
  { href: "/admin/settlements", label: "Settlements", icon: CreditCard, permission: "settlements" },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent, permission: "coupons" },
  { href: "/admin/promotions", label: "Promotions", icon: Sparkles, permission: "coupons" },
  { href: "/admin/products", label: "Products", icon: ShoppingBag, permission: "products" },
  { href: "/admin/communities", label: "Communities", icon: MessagesSquare, permission: "communities" },
  { href: "/admin/live", label: "Live", icon: Radio, permission: "live" },
  { href: "/admin/streaming-accounts", label: "Streaming accounts", icon: Radio, permission: "live" },
  { href: "/admin/reports", label: "Reports", icon: ShieldAlert, permission: "reports" },
  { href: "/admin/events-map", label: "Event map pins", icon: MapPin, permission: "reports" },
  { href: "/admin/watermark/forensics", label: "Watermark forensics", icon: Fingerprint, permission: "reports" },
  { href: "/admin/ads", label: "Ads", icon: Megaphone, permission: "ads" },
  { href: "/admin/statistics", label: "Analytics", icon: BarChart3, permission: "statistics" },
  { href: "/admin/search", label: "Search analytics", icon: Search, permission: "statistics" },
  { href: "/admin/roles", label: "Admin accounts", icon: KeyRound, permission: "admins" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, permission: "audit" },
  { href: "/admin/security/logins", label: "Login history", icon: History, permission: "audit" },
  { href: "/admin/security/access", label: "Access log", icon: Globe, permission: "audit" },
  { href: "/admin/settings/security", label: "Security settings", icon: Lock, permission: "settings" },
  { href: "/admin/settings", label: "System settings", icon: Settings, permission: "settings" },
];

export const ADMIN_LEGACY_NAV: AdminNavItem[] = [
  { href: "/admin/market", label: `${MARKET_BRAND_NAME} 분쟁`, icon: Gavel, permission: "legacy.ops" },
  { href: "/admin/finance", label: "Revenue & payouts", icon: Landmark, permission: "legacy.ops" },
  { href: "/admin/flowers", label: "Flower Gift", icon: Flower2, permission: "legacy.ops" },
  { href: "/admin/moderation", label: "Risk queue", icon: ShieldAlert, permission: "reports" },
  { href: "/admin/suspensions", label: "Account sanctions", icon: Shield, permission: "reports" },
];

export function getAdminPageTitle(pathname: string): string {
  const all = [...ADMIN_PRIMARY_NAV, ...ADMIN_LEGACY_NAV];
  const exact = all.find((item) => item.href === pathname);
  if (exact) return exact.label;
  const prefix = all
    .filter((item) => item.href !== "/admin" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return prefix?.label ?? "Admin";
}

export function filterNavByPermissions(
  items: AdminNavItem[],
  permissions: AdminPermission[]
): AdminNavItem[] {
  const set = new Set(permissions);
  return items.filter((item) => set.has(item.permission));
}
