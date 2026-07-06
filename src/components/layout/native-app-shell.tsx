"use client";

import { memo, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NativeAppHeader } from "@/components/layout/native-app-header";
import { NativeAppNav } from "@/components/layout/native-app-nav";
import { NativeAppComposeFab } from "@/components/layout/native-app-compose-fab";
import { OfflineBanner } from "@/components/layout/offline-banner";
import {
  isFastHubPath,
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
  const isProfileRoute = pathname.startsWith("/u/");
  const skipTabMotion =
    prevPathRef.current !== pathname &&
    isFastHubPath(prevPathRef.current) &&
    isFastHubPath(pathname);
  prevPathRef.current = pathname;
  const reduced = usePrefersReducedMotion();
  const isAuthRoute = pathname.startsWith("/auth");
  const isLegalRoute = pathname.startsWith("/legal");
  const hideNav = shouldHideNativeAppNav(pathname);
  const hideHeader = shouldHideNativeAppHeader(pathname);
  const mainPb = nativeAppMainPadding(pathname);
  const isVoiceRoom = pathname.startsWith("/voice/") && pathname !== "/voice/new";
  const isAptImmersive = isAptImmersivePath(pathname ?? "");

  const pageMotion =
    reduced || isProfileRoute ? (
      <div key={pathname} className="min-h-full">
        {children}
      </div>
    ) : skipTabMotion ? (
    <div key={pathname} className="min-h-full">
      {children}
    </div>
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
      <OfflineBanner className="sticky top-0 z-50" />
      <main
        className={`bg-background overflow-y-auto overscroll-y-contain ${
          hideHeader ? "h-dvh pt-safe" : "h-[calc(100dvh-3.25rem-env(safe-area-inset-top,0px))]"
        } ${mainPb}`}
      >
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
