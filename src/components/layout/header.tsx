"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { FolkSunFace } from "@/components/brand/folk-decor";
import { HeaderSearch } from "@/components/search/header-search";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeaderAuth } from "@/components/layout/header-auth";
import { MobileDrawerNav, MobileMenuButton } from "@/components/layout/mobile-drawer-nav";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="folk-brush-border-b sticky top-0 z-[100] flex h-14 items-center gap-2 sm:gap-3 border-b-2 border-folk-cobalt/20 bg-background/95 backdrop-blur-md px-3 sm:px-5 shadow-folk-sm pt-safe isolate">
        <div className="flex items-center gap-2 shrink-0 lg:hidden">
          <MobileMenuButton onClick={() => setMenuOpen(true)} />
          <Link href="/" className="flex items-center gap-2 text-foreground min-w-0">
            <FolkSunFace size={32} className="animate-folk-float lg:hidden" />
            <span className="font-display font-bold text-base truncate folk-chunky-text text-folk-cobalt">
              {BRAND.name}
            </span>
          </Link>
        </div>
        <Link
          href="/"
          className="hidden lg:flex items-center gap-2 shrink-0 text-foreground min-w-0"
        >
          <span className="h-9 w-9 rounded-lg bg-folk-cream border-2 border-folk-cobalt/30 flex items-center justify-center overflow-hidden p-0.5 shrink-0 shadow-folk-sm">
            <BrandLogo size={32} priority />
          </span>
          <span className="font-display font-bold text-lg truncate folk-chunky-text text-folk-cobalt">
            {BRAND.name}
          </span>
        </Link>

        <div className="flex flex-1 justify-center max-w-2xl mx-auto min-w-0">
          <HeaderSearch />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeToggle />
          <HeaderAuth />
        </div>
      </header>
      <MobileDrawerNav open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
