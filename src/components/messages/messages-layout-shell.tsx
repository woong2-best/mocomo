"use client";

import { usePathname } from "next/navigation";
import { shouldHideMobileNav } from "@/lib/mobile-shell";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

/** Split inbox + chat shell — `/messages` and `/messages/[roomId]` only */
function usesMessagesSplitShell(pathname: string) {
  if (pathname === "/messages") return true;
  const match = pathname.match(/^\/messages\/([^/]+)$/);
  if (!match) return false;
  const segment = match[1];
  return segment !== "new" && segment !== "join";
}

export function MessagesLayoutShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const { isNativeApp } = useClientPlatform();
  const immersive = shouldHideMobileNav(pathname);
  const splitShell = usesMessagesSplitShell(pathname);
  const isRoom = /^\/messages\/[^/]+$/.test(pathname) && splitShell;

  if (!splitShell) {
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

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 overflow-hidden",
        immersive ? "h-full min-h-0" : isNativeApp ? "flex-1 min-h-0" : "h-app-nav"
      )}
    >
      <div className="flex flex-1 min-h-0 h-full">
        <div className={cn("shrink-0 min-h-0", isRoom && "hidden md:flex")}>{sidebar}</div>
        <div className="flex-1 flex flex-col min-w-0 min-h-0">{children}</div>
      </div>
    </div>
  );
}
