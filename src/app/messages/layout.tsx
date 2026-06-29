"use client";

import { usePathname } from "next/navigation";
import { shouldHideMobileNav } from "@/lib/mobile-shell";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isNativeApp } = useClientPlatform();
  const immersive = shouldHideMobileNav(pathname);

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 overflow-hidden",
        immersive ? "h-full min-h-0" : isNativeApp ? "flex-1 min-h-0" : "h-app-nav"
      )}
    >
      {children}
    </div>
  );
}
