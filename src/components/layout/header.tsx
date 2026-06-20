"use client";

import { useState } from "react";
import Link from "next/link";
import { FolkThemeCelestial } from "@/components/brand/folk-theme-celestial";
import { HeaderSearch } from "@/components/search/header-search";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeaderAuth } from "@/components/layout/header-auth";
import { MobileDrawerNav, MobileMenuButton } from "@/components/layout/mobile-drawer-nav";
import { SidebarToggleButton } from "@/components/layout/sidebar-toggle-button";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="folk-brush-border-b sticky top-0 z-[150] flex min-h-14 items-center gap-2 sm:gap-3 border-b-2 border-folk-cobalt/20 bg-background/95 backdrop-blur-md px-3 sm:px-5 shadow-folk-sm pt-safe pb-1">
        <div className="app-header-interactive flex items-center gap-2 shrink-0 lg:hidden">
          <MobileMenuButton onClick={() => setMenuOpen(true)} />
          <Link href={DEFAULT_LANDING_PATH} className="flex items-center gap-2 text-foreground min-w-0">
            <FolkThemeCelestial size={32} className="animate-folk-float lg:hidden" />
            <span className="font-display font-bold text-base truncate folk-chunky-text text-folk-cobalt">
              {BRAND.name}
            </span>
          </Link>
        </div>
        <SidebarToggleButton />

        <div className="app-header-interactive flex flex-1 justify-center max-w-2xl mx-auto min-w-0">
          <HeaderSearch />
        </div>

        <div className="app-header-interactive flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </header>
      <MobileDrawerNav open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
