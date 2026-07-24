import type { LucideIcon } from "lucide-react";
import {
  User,
  MessageSquare,
  Star,
  Wallet,
  Tv,
  Radio,
  Sparkles,
  Search,
  Store,
  Users,
  Camera,
  Calendar,
  Crown,
  Tags,
  Banknote,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";
import { SupportTrophyIcon } from "@/components/icons/support-trophy-icon";

export type NavIcon = LucideIcon | typeof SupportTrophyIcon;

export type NavItem = { href: string; icon: NavIcon; labelKey: MessageKey };

/** /money 허브 — 후원 정산 출금 / Wallet / 프리미엄 */
export const monetizationNavItems: NavItem[] = [
  { href: "/support", icon: SupportTrophyIcon, labelKey: "nav.support" },
  { href: "/wallet", icon: Wallet, labelKey: "nav.wallet" },
  { href: "/premium", icon: Crown, labelKey: "nav.premium" },
];

/** /money 허브 진입용 (사이드바 mainNav에는 미포함 — 필요 시 별도 노출) */
export const moneyHubNavItem: NavItem = {
  href: "/money",
  icon: Banknote,
  labelKey: "nav.money",
};

export const mainNavItems: NavItem[] = [
  { href: "/my-page", icon: User, labelKey: "nav.myPage" },
  { href: "/communities", icon: Users, labelKey: "nav.communities" },
  { href: "/messages", icon: MessageSquare, labelKey: "nav.messages" },
  { href: "/star", icon: Star, labelKey: "nav.star" },
  { href: "/live", icon: Radio, labelKey: "nav.live" },
  { href: "/avatar/studio", icon: Sparkles, labelKey: "nav.liveStudio" },
  { href: "/cosplay", icon: Camera, labelKey: "nav.cosplay" },
  { href: "/market", icon: Store, labelKey: "nav.market" },
  { href: "/used", icon: Tags, labelKey: "nav.used" },
  { href: "/anime", icon: Tv, labelKey: "nav.anime" },
  { href: "/events", icon: Calendar, labelKey: "nav.events" },
  { href: "/discover", icon: Search, labelKey: "nav.discover" },
];
