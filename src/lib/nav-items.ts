import type { LucideIcon } from "lucide-react";
import {
  User,
  MessageCircle,
  Star,
  Wallet,
  Banknote,
  Trophy,
  Tv,
  PenSquare,
  Radio,
  Sparkles,
  BookOpen,
  LayoutGrid,
  PenLine,
  Compass,
  Users,
  Camera,
  Calendar,
  Crown,
  PencilLine,
  Tags,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";

export type NavItem = { href: string; icon: LucideIcon; labelKey: MessageKey };

export const mainNavItems: NavItem[] = [
  { href: "/explore", icon: Compass, labelKey: "nav.explore" },
  { href: "/my-page", icon: User, labelKey: "nav.myPage" },
  { href: "/communities", icon: Users, labelKey: "nav.communities" },
  { href: "/messages", icon: MessageCircle, labelKey: "nav.messages" },
  { href: "/star", icon: Star, labelKey: "nav.star" },
  { href: "/anime", icon: Tv, labelKey: "nav.anime" },
  { href: "/cosplay", icon: Camera, labelKey: "nav.cosplay" },
  { href: "/live", icon: Radio, labelKey: "nav.live" },
  { href: "/avatar/studio", icon: Sparkles, labelKey: "nav.liveStudio" },
  { href: "/webtoon", icon: LayoutGrid, labelKey: "nav.webtoon" },
  { href: "/webtoon/studio", icon: PenLine, labelKey: "nav.webtoonStudio" },
  { href: "/works", icon: BookOpen, labelKey: "nav.works" },
  { href: "/used", icon: Tags, labelKey: "nav.used" },
  { href: "/events", icon: Calendar, labelKey: "nav.events" },
  { href: "/sketch-quiz", icon: PencilLine, labelKey: "nav.sketchQuiz" },
  { href: "/rankings", icon: Trophy, labelKey: "nav.rankings" },
  { href: "/support", icon: Wallet, labelKey: "nav.support" },
  { href: "/wallet", icon: Banknote, labelKey: "nav.wallet" },
  { href: "/premium", icon: Crown, labelKey: "nav.premium" },
  { href: "/compose", icon: PenSquare, labelKey: "nav.compose" },
];
