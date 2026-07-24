"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function DiscoverMatchesChrome({ children }: { children: React.ReactNode }) {
  const { isNativeApp } = useClientPlatform();

  return (
    <div
      className={cn(
        "relative min-h-[calc(100dvh-var(--header-h))] bg-background text-foreground",
        !isNativeApp && "pb-nav lg:pb-4"
      )}
    >
      {!isNativeApp && (
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-md">
          <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
            <Link href="/discover" className="text-sm text-primary hover:underline">
              ← 매칭
            </Link>
            <h1 className="font-display font-bold text-lg flex items-center gap-1.5">
              <Search className="h-4 w-4 text-folk-terracotta" />
              Matches
            </h1>
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
