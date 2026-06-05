"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenSquare } from "lucide-react";
import { ComposeOpenButton } from "@/components/compose/compose-open-button";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/nav-items";
import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { SidebarNotificationBadge } from "@/components/notifications/sidebar-notification-badge";

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
    <aside className="hidden lg:flex w-[17rem] xl:w-[18rem] flex-col shrink-0 sticky top-14 h-app bg-muted/30 dark:bg-background border-r border-border p-4 gap-4 overflow-y-auto">
      <Link href="/" className="sidebar-block !py-4 !shadow-md">
        <div className="h-11 w-11 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden p-0.5">
          <BrandLogo size={40} priority />
        </div>
        <div className="min-w-0">
          <span className="text-lg font-bold block truncate">{BRAND.name}</span>
          <p className="text-xs text-muted-foreground font-normal">{BRAND.tagline}</p>
        </div>
      </Link>

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
                "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
                isActive(href) ? "bg-[#e53935] text-white" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{t(labelKey)}</span>
            {href === "/notifications" && <SidebarNotificationBadge />}
          </Link>
        ))}
      </nav>

      {!shouldShowRightPanel(pathname) && (
        <ComposeOpenButton className="block w-full shrink-0 bg-[#e53935] text-white flex items-center justify-center gap-2 py-3 text-sm rounded-2xl hover:bg-[#c62828] transition-colors">
          <PenSquare className="h-4 w-4" />
          글쓰기
        </ComposeOpenButton>
      )}
    </aside>
  );
}
