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
        "bottom-[calc(var(--mobile-nav-h)+0.75rem)]"
      )}
      aria-label="글쓰기"
    >
      <Link href="/used/new" prefetch>
        +
      </Link>
    </Button>
  );
}
