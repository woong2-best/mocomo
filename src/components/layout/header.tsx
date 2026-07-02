"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { HeaderSearch } from "@/components/search/header-search";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeaderAuth } from "@/components/layout/header-auth";
import { MobileDrawerNav, MobileMenuButton } from "@/components/layout/mobile-drawer-nav";
import { SidebarToggleButton } from "@/components/layout/sidebar-toggle-button";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { cn } from "@/lib/utils";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-[150] flex min-h-14 items-center gap-2 sm:gap-3 border-b border-border bg-background/95 backdrop-blur-md px-3 sm:px-5 pt-safe pb-1">
        <div className="app-header-interactive flex items-center gap-2 shrink-0 lg:hidden">
          <MobileMenuButton onClick={() => setMenuOpen(true)} />
          <Link href={DEFAULT_LANDING_PATH} className="flex items-center gap-2 text-foreground min-w-0">
            <span className="font-display font-bold text-base truncate folk-chunky-text text-folk-cobalt">
              {BRAND.name}
            </span>
          </Link>
        </div>
        <SidebarToggleButton />

        <div className="app-header-interactive hidden lg:flex flex-1 justify-center max-w-2xl mx-auto min-w-0">
          <HeaderSearch variant="header" />
        </div>

        <div className="flex-1 min-w-0 lg:hidden" aria-hidden />

        <div className="app-header-interactive flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <Link
            href="/search"
            className={cn(
              "lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted/60 text-foreground"
            )}
            aria-label="검색"
          >
            <Search className="h-5 w-5" />
          </Link>
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </header>
      <MobileDrawerNav open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
