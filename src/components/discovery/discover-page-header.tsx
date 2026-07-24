"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Settings, MessageCircleHeart } from "lucide-react";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { DiscoveryMatchBadge } from "@/components/discovery/discovery-match-badge";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export function DiscoverPageHeader() {
  const { isNativeApp } = useClientPlatform();
  const reduced = usePrefersReducedMotion();
  const motionProps = reduced
    ? {}
    : { initial: { y: -10, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.3 } };

  const inner = (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-8 w-8 rounded-full bg-folk-terracotta/90 flex items-center justify-center shrink-0 shadow-sm">
          <Search className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <h1 className="font-display font-black text-xl tracking-tight truncate text-foreground">
          매칭
        </h1>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Link
          href="/discover/matches"
          className="relative p-2.5 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="매칭 목록"
        >
          <MessageCircleHeart className="h-5 w-5" />
          <DiscoveryMatchBadge />
        </Link>
        <Link
          href="/discover/settings"
          className="p-2.5 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="설정"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </>
  );

  if (isNativeApp) {
    return (
      <motion.div
        {...motionProps}
        className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-2 pt-safe border-b border-border/60 bg-background/90 backdrop-blur-md"
      >
        {inner}
      </motion.div>
    );
  }

  return (
    <motion.header
      {...motionProps}
      className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-md"
    >
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">{inner}</div>
    </motion.header>
  );
}
