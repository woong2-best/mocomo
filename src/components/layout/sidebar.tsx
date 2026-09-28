"use client";

import { PrefetchLink } from "@/components/ui/prefetch-link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PenSquare } from "lucide-react";
import { ComposeOpenButton } from "@/components/compose/compose-open-button";
import { LegalComplianceSidebarButton } from "@/components/layout/legal-compliance-sidebar-button";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/nav-items";
import { useLocale } from "@/components/providers/locale-provider";
import { isLiveFeatureEnabled, isLiveHubListingPath, isLiveNavHref } from "@/lib/live-feature";
import { isNavItemActive, resolveMyPageHref } from "@/lib/nav-active";
import { useSidebarToggle } from "@/components/providers/sidebar-toggle-provider";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLocale();
  const { open } = useSidebarToggle();
  const iconOnly = isLiveHubListingPath(pathname ?? "");
  const expandedWidth = iconOnly ? "4.25rem" : "14.5rem";
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
        open ? (iconOnly ? "w-[4.25rem]" : "w-[14.5rem]") : "w-0"
      )}
      aria-hidden={!open}
    >
      <aside
        style={{ width: expandedWidth }}
        className={cn(
          "flex h-full min-h-0 flex-col shrink-0 shell-col-pad shell-col-divider-r folk-sidebar-panel overflow-hidden overscroll-none",
          iconOnly && "folk-sidebar-panel-icon-only px-1.5",
          !open && "pointer-events-none invisible"
        )}
      >
        <div className="folk-sidebar-nav-stack">
          <nav className="folk-sidebar-nav" aria-label="주요 메뉴">
            {navItems.map(({ href, icon: Icon, labelKey }) => (
              <PrefetchLink
                key={href}
                href={href}
                className={cn(
                  "sidebar-block drop-shadow-sm",
                  isActive(href) && "sidebar-block-active",
                  iconOnly && "justify-center gap-0 px-2"
                )}
              >
                <span
                  className={cn(
                    "sidebar-block-icon flex items-center justify-center rounded-lg shrink-0 border-2",
                    isActive(href) && "sidebar-block-icon-active"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className={cn("truncate", iconOnly && "sr-only")}>{t(labelKey)}</span>
              </PrefetchLink>
            ))}
          </nav>

          <div className="folk-sidebar-compose">
            <ComposeOpenButton
              className={cn("folk-sidebar-compose-btn", iconOnly && "folk-sidebar-compose-btn-icon-only")}
            >
              <PenSquare className="h-4 w-4 shrink-0" />
              <span className={cn(iconOnly && "sr-only")}>{t("nav.compose")}</span>
            </ComposeOpenButton>
          </div>
        </div>

        <div className="folk-sidebar-legal shrink-0">
          <LegalComplianceSidebarButton iconOnly={iconOnly} />
        </div>
      </aside>
    </div>
  );
}
