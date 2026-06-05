"use client";

import { usePathname } from "next/navigation";
import { shouldHideUsedSectionHeader } from "@/lib/mobile-shell";
import { UsedSectionHeader } from "@/components/used/used-section-header";

export function UsedLayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (shouldHideUsedSectionHeader(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-nav lg:pb-8 space-y-4 min-w-0">
      <UsedSectionHeader />
      {children}
    </div>
  );
}
