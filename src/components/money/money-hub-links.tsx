"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { monetizationNavItems } from "@/lib/nav-items";
import { isNavItemActive } from "@/lib/nav-active";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/** MONEY 허브 — 후원 정산 출금 / Wallet / 프리미엄 */
export function MoneyHubLinks() {
  const pathname = usePathname();
  const { t } = useLocale();
  const navHrefs = monetizationNavItems.map((item) => item.href);

  return (
    <nav className="flex flex-col gap-2">
      {monetizationNavItems.map(({ href, icon: Icon, labelKey }) => {
        const active = isNavItemActive(pathname, href, navHrefs);
        return (
          <Link
            key={href}
            href={href}
            className={cn("sidebar-block", active && "sidebar-block-active")}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg shrink-0 border-2",
                active
                  ? "bg-folk-terracotta text-white border-folk-cobalt/40 shadow-folk-sm"
                  : "bg-folk-cream border-folk-cobalt/15 text-folk-cobalt"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="truncate">{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
