"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { FolkThemeCelestial } from "@/components/brand/folk-theme-celestial";
import { HeaderSearch } from "@/components/search/header-search";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeaderAuth } from "@/components/layout/header-auth";
import { MobileDrawerNav, MobileMenuButton } from "@/components/layout/mobile-drawer-nav";
import { useSidebarToggle } from "@/components/providers/sidebar-toggle-provider";
import { cn } from "@/lib/utils";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { open: sidebarOpen, toggle: toggleSidebar } = useSidebarToggle();

  return (
    <>
      <header className="folk-brush-border-b sticky top-0 z-[150] flex min-h-14 items-center gap-2 sm:gap-3 border-b-2 border-folk-cobalt/20 bg-background/95 backdrop-blur-md px-3 sm:px-5 shadow-folk-sm pt-safe pb-1">
        <div className="app-header-interactive flex items-center gap-2 shrink-0 lg:hidden">
          <MobileMenuButton onClick={() => setMenuOpen(true)} />
          <Link href="/" className="flex items-center gap-2 text-foreground min-w-0">
            <FolkThemeCelestial size={32} className="animate-folk-float lg:hidden" />
            <span className="font-display font-bold text-base truncate folk-chunky-text text-folk-cobalt">
              {BRAND.name}
            </span>
          </Link>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "사이드바 숨기기" : "사이드바 보이기"}
          aria-expanded={sidebarOpen}
          className={cn(
            "app-header-interactive hidden lg:flex items-center gap-2 shrink-0 text-foreground min-w-0 rounded-xl transition-colors",
            "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-terracotta/50",
            !sidebarOpen && "ring-2 ring-folk-terracotta/40 bg-muted/40"
          )}
        >
          <span className="h-9 w-9 rounded-lg bg-folk-cream border-2 border-folk-cobalt/30 flex items-center justify-center overflow-hidden p-0.5 shrink-0 shadow-folk-sm">
            <BrandLogo size={32} priority />
          </span>
          <span className="font-display font-bold text-lg truncate folk-chunky-text text-folk-cobalt">
            {BRAND.name}
          </span>
        </button>

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
