"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Home,
  Compass,
  Bell,
  Users,
  Camera,
  ShoppingBag,
  Calendar,
  Crown,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { SidebarAuthFooter } from "@/components/layout/sidebar-auth-footer";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const navBlocks: { href: string; icon: typeof Home; labelKey: MessageKey }[] = [
  { href: "/", icon: Home, labelKey: "nav.home" },
  { href: "/explore", icon: Compass, labelKey: "nav.explore" },
  { href: "/notifications", icon: Bell, labelKey: "nav.notifications" },
  { href: "/my-page", icon: User, labelKey: "nav.myPage" },
  { href: "/communities", icon: Users, labelKey: "nav.communities" },
  { href: "/messages", icon: MessageCircle, labelKey: "nav.messages" },
  { href: "/star", icon: Star, labelKey: "nav.star" },
  { href: "/anime", icon: Tv, labelKey: "nav.anime" },
  { href: "/cosplay", icon: Camera, labelKey: "nav.cosplay" },
  { href: "/live", icon: Radio, labelKey: "nav.live" },
  { href: "/used", icon: Tags, labelKey: "nav.used" },
  { href: "/market", icon: ShoppingBag, labelKey: "nav.market" },
  { href: "/events", icon: Calendar, labelKey: "nav.events" },
  { href: "/rankings", icon: Trophy, labelKey: "nav.rankings" },
  { href: "/support", icon: Wallet, labelKey: "nav.support" },
  { href: "/wallet", icon: Banknote, labelKey: "nav.wallet" },
  { href: "/premium", icon: Crown, labelKey: "nav.premium" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="hidden lg:flex w-[17rem] xl:w-[18rem] flex-col shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] bg-muted/30 dark:bg-background border-r border-border p-4 gap-4 overflow-y-auto">
      <Link
        href="/"
        className="sidebar-block !py-4 !shadow-md"
      >
        <div className="h-11 w-11 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden p-0.5">
          <BrandLogo size={40} priority />
        </div>
        <div className="min-w-0">
          <span className="text-lg font-bold block truncate">{BRAND.name}</span>
          <p className="text-xs text-muted-foreground font-normal">{BRAND.tagline}</p>
        </div>
      </Link>

      <nav className="flex flex-col gap-2.5 flex-1">
        {navBlocks.map(({ href, icon: Icon, labelKey }) => (
              <Link
                key={href}
                href={href}
                prefetch={href === "/live" || href === "/messages" ? false : undefined}
            className={cn("sidebar-block", isActive(href) && "sidebar-block-active")}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
                isActive(href)
                  ? "bg-[#e53935] text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{t(labelKey)}</span>
          </Link>
        ))}
      </nav>

      <Link href="/compose" className="block">
        <span className="bg-[#e53935] text-white w-full flex items-center justify-center gap-2 py-3 text-sm rounded-2xl hover:bg-[#c62828] transition-colors">
          <PenSquare className="h-4 w-4" />
          글쓰기
        </span>
      </Link>

      <SidebarAuthFooter />
    </aside>
  );
}
