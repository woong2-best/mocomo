"use client";

import { cn } from "@/lib/utils";

/** Mobile floating tab bar — same footprint as real tabs. */
export function FloatingTabNavPlaceholder({ className }: { className?: string }) {
  return (
    <nav
      aria-label="주요 메뉴"
      aria-busy="true"
      className={cn("floating-tab-nav-shell lg:hidden", className)}
    >
      <div className="floating-tab-nav-pill">
        <div className="floating-tab-nav-row">
          {[0, 1, 2].map((i) => (
            <div key={i} className="floating-tab-nav-item pointer-events-none opacity-70">
              <span className="flex flex-col items-center gap-0.5">
                <span className="h-[23px] w-[23px] rounded-md bg-muted/60 animate-pulse" />
                <span className="h-2 w-10 rounded bg-muted/40 animate-pulse" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}

/** Home welcome / compose strip height. */
export function HomeHeroPlaceholder() {
  return (
    <div
      className="folk-hero-banner mb-6 min-h-24 rounded-2xl bg-muted/40 animate-pulse"
      aria-busy="true"
      aria-label="Loading"
    />
  );
}
