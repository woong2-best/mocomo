"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { monetizationNavItems } from "@/lib/nav-items";
import { isNavItemActive } from "@/lib/nav-active";
import { useLocale } from "@/components/providers/locale-provider";
import { RightPanelComposeButton } from "@/components/layout/right-panel-compose";
import { ProfileCalendar } from "@/components/layout/profile-calendar";
import { cn } from "@/lib/utils";

/** 프로필(/u/*) 전용 — 상단 달력 + 하단 글쓰기·후원·Wallet·프리미엄 */
export function ProfileRightPanel() {
  const pathname = usePathname();
  const { t } = useLocale();
  const navHrefs = monetizationNavItems.map((item) => item.href);

  return (
    <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 h-full flex-col folk-panel-aside overflow-y-auto overscroll-contain">
      {/* 달력만 패널 가장자리에 풀블리드로 딱 붙임 */}
      <ProfileCalendar />

      <div className="mt-auto flex flex-col gap-3 p-4 lg:p-6 pt-4">
        <RightPanelComposeButton />
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
      </div>
    </aside>
  );
}
