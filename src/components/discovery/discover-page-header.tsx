"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Settings, MessageCircleHeart } from "lucide-react";
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
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-rose-500/30">
          <Flame className="h-4 w-4 text-white" />
        </div>
        <h1 className="font-display font-black text-xl tracking-tight truncate bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
          매칭
        </h1>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Link
          href="/discover/matches"
          className="relative p-2.5 rounded-full hover:bg-white/8 text-white/70 hover:text-rose-300 transition-colors"
          aria-label="매칭 목록"
        >
          <MessageCircleHeart className="h-5 w-5" />
          <DiscoveryMatchBadge />
        </Link>
        <Link
          href="/discover/settings"
          className="p-2.5 rounded-full hover:bg-white/8 text-white/70 hover:text-white transition-colors"
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
        className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-2 pt-safe border-b border-white/5 bg-[#0c0c0c]/90 backdrop-blur-md"
      >
        {inner}
      </motion.div>
    );
  }

  return (
    <motion.header
      {...motionProps}
      className="sticky top-0 z-20 border-b border-white/5 bg-[#0c0c0c]/90 backdrop-blur-md"
    >
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">{inner}</div>
    </motion.header>
  );
}
