"use client";

import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { useSidebarToggle } from "@/components/providers/sidebar-toggle-provider";
import { cn } from "@/lib/utils";

export function SidebarToggleButton() {
  const { open: sidebarOpen, toggle: toggleSidebar } = useSidebarToggle();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={sidebarOpen ? "사이드바 숨기기" : "사이드바 보이기"}
      aria-expanded={sidebarOpen}
      className={cn(
        "group app-header-interactive hidden lg:flex items-center gap-2 shrink-0 min-w-0 rounded-xl py-1 pr-2 transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-terracotta/50",
        !sidebarOpen && "bg-muted/30 ring-2 ring-folk-terracotta/35"
      )}
    >
      <span
        className={cn(
          "relative h-9 w-9 rounded-lg shrink-0 overflow-hidden border-2 shadow-folk-sm transition-colors",
          "border-folk-cobalt/25 group-hover:border-folk-cobalt/40"
        )}
      >
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-[hsl(224,38%,16%)] transition-opacity duration-200",
            "group-hover:opacity-0 group-hover:pointer-events-none"
          )}
          aria-hidden
        >
          <Menu className="h-4 w-4 text-white" strokeWidth={2.25} />
        </span>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-folk-cream p-0.5 opacity-0 transition-opacity duration-200",
            "group-hover:opacity-100"
          )}
          aria-hidden
        >
          <BrandLogo size={30} priority />
        </span>
      </span>
      <span
        className={cn(
          "font-display font-bold text-lg truncate folk-chunky-text text-folk-cobalt max-w-0 overflow-hidden opacity-0 transition-all duration-200",
          "group-hover:max-w-[8rem] group-hover:opacity-100"
        )}
      >
        {BRAND.name}
      </span>
    </button>
  );
}
