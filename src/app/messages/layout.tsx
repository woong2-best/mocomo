"use client";

import { usePathname } from "next/navigation";
import { shouldHideMobileNav } from "@/lib/mobile-shell";
import { cn } from "@/lib/utils";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = shouldHideMobileNav(pathname);

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 overflow-hidden",
        immersive ? "h-app" : "h-app-nav"
      )}
    >
      {children}
    </div>
  );
}
