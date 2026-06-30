"use client";

import { memo, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NativeAppHeader } from "@/components/layout/native-app-header";
import { NativeAppNav } from "@/components/layout/native-app-nav";
import { NativeAppComposeFab } from "@/components/layout/native-app-compose-fab";
import {
  isNativeTabRoot,
  nativeAppMainPadding,
  shouldHideNativeAppNav,
  shouldHideNativeAppHeader,
} from "@/lib/native-app-shell";
import { isAptImmersivePath } from "@/lib/apt-route";
import { nativeRouteVariants } from "@/lib/motion-presets";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

function NativeAppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const prevPathRef = useRef(pathname);
  const skipTabMotion =
    isNativeTabRoot(prevPathRef.current) && isNativeTabRoot(pathname);
  prevPathRef.current = pathname;
  const reduced = usePrefersReducedMotion();
  const isAuthRoute = pathname.startsWith("/auth");
  const isLegalRoute = pathname.startsWith("/legal");
  const hideNav = shouldHideNativeAppNav(pathname);
  const hideHeader = shouldHideNativeAppHeader(pathname);
  const mainPb = nativeAppMainPadding(pathname);
  const isVoiceRoom = pathname.startsWith("/voice/") && pathname !== "/voice/new";
  const isAptImmersive = isAptImmersivePath(pathname ?? "");

  const pageMotion = reduced || skipTabMotion ? (
    <>{children}</>
  ) : (
    <motion.div
      key={pathname}
      className="min-h-full"
      variants={nativeRouteVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );

  if (isVoiceRoom) {
    return <main className="min-h-dvh bg-background">{pageMotion}</main>;
  }

  if (isAptImmersive) {
    return <main className="fixed inset-0 z-40 overflow-hidden bg-[#0a0a12]">{children}</main>;
  }

  if (isAuthRoute || isLegalRoute) {
    return (
      <main className={`min-h-dvh bg-background pt-safe ${mainPb}`}>
        <div className="mx-auto w-full max-w-lg moco-enter">{pageMotion}</div>
      </main>
    );
  }

  return (
    <>
      {!hideHeader && <NativeAppHeader />}
      <main className={`min-h-[calc(100dvh-3.25rem)] bg-background ${mainPb} ${hideHeader ? "pt-safe" : ""}`}>
        <div className="mx-auto w-full max-w-lg min-h-full border-x border-border/40 bg-background">
          {pageMotion}
        </div>
      </main>
      {!hideNav && <NativeAppNav />}
      <NativeAppComposeFab />
    </>
  );
}

export const NativeAppShell = memo(NativeAppShellInner);
