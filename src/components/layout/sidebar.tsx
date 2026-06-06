"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenSquare } from "lucide-react";
import { ComposeOpenButton } from "@/components/compose/compose-open-button";
import { FolkBrushDivider, FolkFloralAccent, FolkSunFace } from "@/components/brand/folk-decor";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/nav-items";
import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navItems = mainNavItems.filter(
    (item) =>
      item.href !== "/compose" &&
      (isLiveFeatureEnabled() || !isLiveNavHref(item.href))
  );

  return (
    <aside className="hidden lg:flex w-[17rem] xl:w-[18rem] flex-col shrink-0 sticky top-14 h-app bg-[hsl(var(--folk-cream)/0.6)] dark:bg-background border-r-2 border-folk-cobalt/20 p-4 gap-3 overflow-y-auto relative">
      <FolkFloralAccent className="absolute -right-2 top-24 w-24 h-16 pointer-events-none" />

      <Link href="/" className="sidebar-block !py-4 !shadow-folk">
        <FolkSunFace size={40} className="hidden xl:block animate-folk-float" />
        <div className="h-11 w-11 rounded-xl bg-folk-cream border-2 border-folk-cobalt/25 flex items-center justify-center shrink-0 overflow-hidden p-0.5 xl:hidden">
          <BrandLogo size={40} priority />
        </div>
        <div className="min-w-0">
          <span className="text-lg font-display font-bold block truncate text-folk-cobalt folk-chunky-text">
            {BRAND.name}
          </span>
          <p className="text-xs text-folk-forest font-medium">{BRAND.tagline}</p>
        </div>
      </Link>

      <FolkBrushDivider />

      <nav className="flex flex-col gap-2 flex-1 min-h-0">
        {navItems.map(({ href, icon: Icon, labelKey }) => (
          <Link
            key={href}
            href={href}
            prefetch={href === "/live" || href === "/messages" ? false : undefined}
            className={cn("sidebar-block", isActive(href) && "sidebar-block-active")}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg shrink-0 border-2",
                isActive(href)
                  ? "bg-folk-terracotta text-white border-folk-cobalt/40 shadow-folk-sm"
                  : "bg-folk-cream border-folk-cobalt/15 text-folk-cobalt"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{t(labelKey)}</span>
          </Link>
        ))}
      </nav>

      {!shouldShowRightPanel(pathname) && (
        <ComposeOpenButton className="block w-full shrink-0 bg-folk-terracotta text-white flex items-center justify-center gap-2 py-3 text-sm font-display font-bold rounded-xl hover:bg-folk-terracotta-dark transition-colors border-2 border-folk-cobalt/25 shadow-folk">
          <PenSquare className="h-4 w-4" />
          글쓰기
        </ComposeOpenButton>
      )}
    </aside>
  );
}
