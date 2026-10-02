"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import type { MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { DEFAULT_LANDING_PATH, isCommunityFeedPath } from "@/lib/site-routes";
import { scrollMainToTop } from "@/lib/scroll-main";
import { cn } from "@/lib/utils";

export function SidebarToggleButton() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isHome = isCommunityFeedPath(pathname);

  function onBrandClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!isHome) return;
    e.preventDefault();
    scrollMainToTop();
    router.refresh();
  }

  return (
    <div className="app-header-interactive hidden lg:flex items-center shrink-0 min-w-0">
      <Link
        href={DEFAULT_LANDING_PATH}
        onClick={onBrandClick}
        className={cn(
          "group/home relative inline-flex items-center min-h-10 rounded-lg px-2 py-1 transition-colors",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-terracotta/50"
        )}
        aria-label={isHome ? t("auth.reload", { v0: BRAND.name }) : t("layout.home")}
      >
        <span
          className={cn(
            "font-display font-bold text-[1.65rem] leading-none tracking-tight folk-chunky-text text-[hsl(330,82%,72%)] transition-opacity duration-200",
            "[text-shadow:1px_2px_0_hsl(330,55%,38%/0.45)]",
            !isHome && "group-hover/home:opacity-0"
          )}
        >
          {BRAND.name}
        </span>
        {!isHome && (
          <span
            className={cn(
              "absolute inset-0 flex items-center font-display font-bold text-[1.65rem] leading-none folk-chunky-text text-[hsl(330,82%,72%)] opacity-0 transition-opacity duration-200",
              "[text-shadow:1px_2px_0_hsl(330,55%,38%/0.45)]",
              "group-hover/home:opacity-100"
            )}
          >
            Home
          </span>
        )}
      </Link>
    </div>
  );
}
