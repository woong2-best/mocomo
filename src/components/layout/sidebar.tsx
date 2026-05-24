"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Settings,
  MessageCircle,
  Bookmark,
  Wallet,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { SidebarAuthFooter } from "@/components/layout/sidebar-auth-footer";

const navBlocks = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/explore", icon: Compass, label: "탐색" },
  { href: "/notifications", icon: Bell, label: "알림" },
  { href: "/my-page", icon: User, label: "My Page" },
  { href: "/communities", icon: Users, label: "커뮤니티" },
  { href: "/messages", icon: MessageCircle, label: "메시지" },
  { href: "/bookmarks", icon: Bookmark, label: "북마크" },
  { href: "/anime", icon: Tv, label: "애니" },
  { href: "/cosplay", icon: Camera, label: "코스어" },
  { href: "/live", icon: Radio, label: "라이브" },
  { href: "/market", icon: ShoppingBag, label: "마켓" },
  { href: "/events", icon: Calendar, label: "이벤트" },
  { href: "/rankings", icon: Trophy, label: "후원 랭킹" },
  { href: "/support", icon: Wallet, label: "후원" },
  { href: "/premium", icon: Crown, label: "프리미엄" },
  { href: "/settings", icon: Settings, label: "설정" },
];

export function Sidebar() {
  const pathname = usePathname();

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
        <div className="h-11 w-11 rounded-xl btn-rainbow flex items-center justify-center text-lg font-black shrink-0">
          M
        </div>
        <div className="min-w-0">
          <span className="text-lg font-bold block truncate">{BRAND.name}</span>
          <p className="text-xs text-muted-foreground font-normal">{BRAND.tagline}</p>
        </div>
      </Link>

      <nav className="flex flex-col gap-2.5 flex-1">
        {navBlocks.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn("sidebar-block", isActive(href) && "sidebar-block-active")}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
                isActive(href)
                  ? "btn-rainbow text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      <Link href="/compose" className="block">
        <span className="btn-rainbow w-full flex items-center justify-center gap-2 py-3 text-sm rounded-2xl">
          <PenSquare className="h-4 w-4" />
          글쓰기
        </span>
      </Link>

      <SidebarAuthFooter />
    </aside>
  );
}
