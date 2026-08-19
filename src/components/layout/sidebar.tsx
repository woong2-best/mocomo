"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PenSquare } from "lucide-react";
import { ComposeOpenButton } from "@/components/compose/compose-open-button";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/nav-items";
import { useLocale } from "@/components/providers/locale-provider";
import { isLiveFeatureEnabled, isLiveNavHref } from "@/lib/live-feature";
import { isNavItemActive, resolveMyPageHref } from "@/lib/nav-active";
import { useSidebarToggle } from "@/components/providers/sidebar-toggle-provider";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLocale();
  const { open } = useSidebarToggle();
  const ownProfilePath = session?.user?.username ? `/u/${session.user.username}` : null;

  const navItems = mainNavItems
    .filter((item) => isLiveFeatureEnabled() || !isLiveNavHref(item.href))
    .map((item) =>
      item.href === "/my-page"
        ? { ...item, href: resolveMyPageHref(session?.user?.username) }
        : item
    );
  const navHrefs = navItems.map((item) => item.href);

  function isActive(href: string) {
    return isNavItemActive(pathname, href, navHrefs, ownProfilePath);
  }

  return (
    <div
      className={cn(
        "hidden lg:block h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
        open ? "w-[17rem] xl:w-[18rem]" : "w-0"
      )}
      aria-hidden={!open}
    >
      <aside
        className={cn(
          "flex h-full w-[17rem] xl:w-[18rem] flex-col shrink-0 shell-col-pad shell-col-divider-r folk-panel-aside space-y-3 overflow-y-auto overscroll-contain",
          !open && "pointer-events-none invisible"
        )}
      >
        <nav className="flex flex-col gap-2 pr-1">
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

        <div className="mt-auto shrink-0 space-y-2 border-t border-border pt-3">
          <ComposeOpenButton className="flex w-full items-center justify-center gap-2 rounded-2xl bg-folk-terracotta py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-folk-terracotta-dark active:scale-[0.98]">
            <PenSquare className="h-4 w-4 shrink-0" />
            {t("nav.compose")}
          </ComposeOpenButton>
        </div>
      </aside>
    </div>
  );
}
