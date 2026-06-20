"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mailbox } from "lucide-react";
import { AptMailboxLink } from "@/components/compose/apt-mailbox-link";
import { FolkFloralAccent } from "@/components/brand/folk-decor";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/nav-items";
import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";
import { useLocale } from "@/components/providers/locale-provider";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { isNavItemActive } from "@/lib/nav-active";
import { AptNavSection } from "@/components/layout/apt-nav-section";
import { useSidebarToggle } from "@/components/providers/sidebar-toggle-provider";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { open } = useSidebarToggle();

  const navItems = mainNavItems.filter(
    (item) => isLiveFeatureEnabled() || !isLiveNavHref(item.href)
  );
  const navHrefs = navItems.map((item) => item.href);

  function isActive(href: string) {
    return isNavItemActive(pathname, href, navHrefs);
  }

  return (
    <div
      className={cn(
        "hidden lg:block shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
        open ? "w-[17rem] xl:w-[18rem]" : "w-0 pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <aside
        className={cn(
          "flex w-[17rem] xl:w-[18rem] flex-col shrink-0 sticky top-[var(--header-h)] h-app bg-[hsl(var(--folk-cream)/0.6)] dark:bg-background border-r-2 border-folk-cobalt/20 p-4 gap-3 overflow-hidden relative z-[1]",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
      <FolkFloralAccent className="absolute -right-2 top-24 w-24 h-16 pointer-events-none" />

      <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5">
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

      <div className="shrink-0 space-y-2 border-t-2 border-folk-cobalt/20 pt-3 bg-[hsl(var(--folk-cream)/0.6)] dark:bg-background">
        <AptNavSection pathname={pathname} />
        {!shouldShowRightPanel(pathname) && (
          <AptMailboxLink className="block w-full shrink-0 bg-folk-terracotta text-white flex items-center justify-center gap-2 py-3 text-sm font-display font-bold rounded-xl hover:bg-folk-terracotta-dark transition-colors border-2 border-folk-cobalt/25 shadow-folk">
            <Mailbox className="h-4 w-4" />
            우편함
          </AptMailboxLink>
        )}
      </div>
      </aside>
    </div>
  );
}
