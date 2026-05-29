import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { HeaderSearch } from "@/components/search/header-search";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeaderAuth } from "@/components/layout/header-auth";

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-2 sm:gap-3 border-b border-border bg-background/95 backdrop-blur-md px-3 sm:px-5 shadow-sm">
      <Link href="/" className="flex items-center gap-2 shrink-0 text-foreground">
        <span className="h-9 w-9 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden p-0.5">
          <BrandLogo size={32} priority />
        </span>
        <span className="font-black text-base sm:text-lg hidden sm:inline">{BRAND.name}</span>
      </Link>

      <div className="flex flex-1 justify-center max-w-2xl mx-auto min-w-0">
        <HeaderSearch />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <ThemeToggle />
        <HeaderAuth />
      </div>
    </header>
  );
}
