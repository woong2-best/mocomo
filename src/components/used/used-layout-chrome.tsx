"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { shouldHideUsedSectionHeader } from "@/lib/mobile-shell";
import { UsedSectionHeader } from "@/components/used/used-section-header";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function UsedLayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isNativeApp } = useClientPlatform();
  if (shouldHideUsedSectionHeader(pathname)) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "mx-auto p-4 lg:pb-8 space-y-2.5 min-w-0",
        pathname === "/market" ? "max-w-6xl" : "max-w-5xl",
        !isNativeApp && "pb-nav"
      )}
    >
      {pathname === "/market" ? null : (
        <Suspense fallback={null}>
          <UsedSectionHeader />
        </Suspense>
      )}
      {children}
    </div>
  );
}
