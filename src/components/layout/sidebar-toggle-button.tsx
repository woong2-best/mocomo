"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { useSidebarToggle } from "@/components/providers/sidebar-toggle-provider";
import { cn } from "@/lib/utils";

export function SidebarToggleButton() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { open: sidebarOpen, toggle: toggleSidebar } = useSidebarToggle();

  return (
    <div className="app-header-interactive hidden lg:flex items-center gap-2 shrink-0 min-w-0">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "사이드바 숨기기" : "사이드바 보이기"}
        aria-expanded={sidebarOpen}
        className={cn(
          "group/icon rounded-xl p-1 transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-terracotta/50",
          !sidebarOpen && "bg-muted/30 ring-2 ring-folk-terracotta/35"
        )}
      >
        <span
          className={cn(
            "relative h-9 w-9 rounded-lg shrink-0 overflow-hidden border-2 shadow-folk-sm transition-colors block",
            "border-folk-cobalt/25 group-hover/icon:border-folk-cobalt/40"
          )}
        >
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-[hsl(224,38%,16%)] transition-opacity duration-200",
              "group-hover/icon:opacity-0 group-hover/icon:pointer-events-none"
            )}
            aria-hidden
          >
            <Menu className="h-4 w-4 text-white" strokeWidth={2.25} />
          </span>
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-folk-cream p-0.5 opacity-0 transition-opacity duration-200",
              "group-hover/icon:opacity-100"
            )}
            aria-hidden
          >
            <BrandLogo size={30} priority />
          </span>
        </span>
      </button>

      <Link
        href="/"
        className={cn(
          "group/home relative inline-block min-w-[5.5rem] rounded-lg px-1 py-0.5 transition-colors",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-terracotta/50"
        )}
        aria-label={isHome ? BRAND.name : "Home으로 이동"}
      >
        <span
          className={cn(
            "block font-display font-bold text-lg folk-chunky-text text-folk-cobalt transition-opacity duration-200",
            !isHome && "group-hover/home:opacity-0"
          )}
        >
          {BRAND.name}
        </span>
        {!isHome && (
          <span
            className={cn(
              "absolute inset-0 flex items-center font-display font-bold text-lg folk-chunky-text text-folk-cobalt opacity-0 transition-opacity duration-200",
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
