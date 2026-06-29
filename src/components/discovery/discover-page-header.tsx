"use client";

import Link from "next/link";
import { Settings, Users } from "lucide-react";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { DiscoveryMatchBadge } from "@/components/discovery/discovery-match-badge";
import { cn } from "@/lib/utils";

export function DiscoverPageHeader() {
  const { isNativeApp } = useClientPlatform();

  if (isNativeApp) {
    return (
      <div className="sticky top-0 z-20 flex justify-end gap-1 px-3 py-2 border-b border-violet-500/10 bg-background/80 backdrop-blur-md">
        <Link
          href="/discover/matches"
          className="relative p-2 rounded-xl hover:bg-muted/60 text-muted-foreground"
          aria-label="매칭 목록"
        >
          <Users className="h-5 w-5" />
          <DiscoveryMatchBadge />
        </Link>
        <Link
          href="/discover/settings"
          className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground"
          aria-label="설정"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b border-violet-500/10 bg-background/80 backdrop-blur-md">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display font-bold text-lg">매칭</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/discover/matches"
            className="relative p-2 rounded-xl hover:bg-muted/60 text-muted-foreground"
            aria-label="매칭 목록"
          >
            <Users className="h-5 w-5" />
            <DiscoveryMatchBadge />
          </Link>
          <Link
            href="/discover/settings"
            className={cn("p-2 rounded-xl hover:bg-muted/60 text-muted-foreground")}
            aria-label="설정"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
