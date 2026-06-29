"use client";

import Link from "next/link";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UsedWriteFab() {
  const { isNativeApp } = useClientPlatform();

  return (
    <Button
      asChild
      variant="secondary"
      size="icon"
      className={cn(
        "fixed right-4 md:bottom-6 z-50 h-14 w-14 rounded-full shadow-lg text-2xl font-light",
        isNativeApp
          ? "bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px)+0.75rem)]"
          : "bottom-[calc(var(--mobile-nav-h)+env(safe-area-inset-bottom,0px)+0.75rem)]"
      )}
      aria-label="글쓰기"
    >
      <Link href="/used/new" prefetch>
        +
      </Link>
    </Button>
  );
}
