import Link from "next/link";
import { Search } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HeaderAuth } from "@/components/layout/header-auth";

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-2 sm:gap-3 border-b border-border bg-background/95 backdrop-blur-md px-3 sm:px-5 shadow-sm">
      <Link href="/" className="font-black text-base sm:text-lg shrink-0 text-foreground">
        {BRAND.name}
      </Link>

      <div className="flex flex-1 justify-center max-w-2xl mx-auto min-w-0">
        <form action="/search" className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            placeholder="검색"
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-[#1e88e5]/40"
          />
        </form>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <ThemeToggle />
        <HeaderAuth />
      </div>
    </header>
  );
}
