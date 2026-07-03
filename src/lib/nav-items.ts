import type { LucideIcon } from "lucide-react";
import {
  User,
  MessageCircle,
  Star,
  Banknote,
  Tv,
  PenSquare,
  Radio,
  Sparkles,
  LayoutGrid,
  Compass,
  Users,
  Camera,
  Calendar,
  Crown,
  Tags,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";
import { SupportTrophyIcon } from "@/components/icons/support-trophy-icon";

export type NavIcon = LucideIcon | typeof SupportTrophyIcon;

export type NavItem = { href: string; icon: NavIcon; labelKey: MessageKey };

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
  { href: "/webtoon", icon: LayoutGrid, labelKey: "nav.webtoon" },
  { href: "/used", icon: Tags, labelKey: "nav.used" },
  { href: "/events", icon: Calendar, labelKey: "nav.events" },
  { href: "/support", icon: SupportTrophyIcon, labelKey: "nav.support" },
  { href: "/wallet", icon: Banknote, labelKey: "nav.wallet" },
  { href: "/premium", icon: Crown, labelKey: "nav.premium" },
  { href: "/compose", icon: PenSquare, labelKey: "nav.compose" },
];
