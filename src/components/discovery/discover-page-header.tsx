"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Settings, Sparkles, Users } from "lucide-react";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { DiscoveryMatchBadge } from "@/components/discovery/discovery-match-badge";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export function DiscoverPageHeader() {
  const { isNativeApp } = useClientPlatform();
  const reduced = usePrefersReducedMotion();
  const motionProps = reduced
    ? {}
    : { initial: { y: -10, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.3 } };

  if (isNativeApp) {
    return (
      <motion.div
        {...motionProps}
        className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-2 pt-safe border-b border-violet-500/10 bg-background/80 backdrop-blur-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-5 w-5 text-violet-500 shrink-0" />
          <h1 className="font-display font-bold text-lg truncate">매칭</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
      </motion.div>
    );
  }

  return (
    <motion.header
      {...motionProps}
      className="sticky top-0 z-20 border-b border-violet-500/10 bg-background/80 backdrop-blur-md"
    >
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
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
    </motion.header>
  );
}
