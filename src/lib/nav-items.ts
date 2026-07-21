import type { LucideIcon } from "lucide-react";
import {
  User,
  MessageCircle,
  Star,
  Wallet,
  Tv,
  PenSquare,
  Radio,
  Sparkles,
  Store,
  Compass,
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

/** 프로필·모바일 메뉴 — MONEY 하나로 /money 진입 */
export const moneyHubNavItem: NavItem = {
  href: "/money",
  icon: Banknote,
  labelKey: "nav.money",
};

export const mainNavItems: NavItem[] = [
  { href: "/explore", icon: Compass, labelKey: "nav.explore" },
  { href: "/discover", icon: Sparkles, labelKey: "nav.discover" },
  { href: "/my-page", icon: User, labelKey: "nav.myPage" },
  { href: "/communities", icon: Users, labelKey: "nav.communities" },
  { href: "/messages", icon: MessageCircle, labelKey: "nav.messages" },
  { href: "/star", icon: Star, labelKey: "nav.star" },
  { href: "/anime", icon: Tv, labelKey: "nav.anime" },
  { href: "/cosplay", icon: Camera, labelKey: "nav.cosplay" },
  { href: "/live", icon: Radio, labelKey: "nav.live" },
  { href: "/avatar/studio", icon: Sparkles, labelKey: "nav.liveStudio" },
  { href: "/market", icon: Store, labelKey: "nav.market" },
  { href: "/used", icon: Tags, labelKey: "nav.used" },
  { href: "/events", icon: Calendar, labelKey: "nav.events" },
  { href: "/compose", icon: PenSquare, labelKey: "nav.compose" },
];
