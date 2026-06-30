"use client";

import { memo } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { NativeAppHeader } from "@/components/layout/native-app-header";
import { NativeAppNav } from "@/components/layout/native-app-nav";
import { NativeAppComposeFab } from "@/components/layout/native-app-compose-fab";
import { nativeAppMainPadding, shouldHideNativeAppNav, shouldHideNativeAppHeader } from "@/lib/native-app-shell";
import { isAptImmersivePath } from "@/lib/apt-route";
import { pageVariants, nativeRouteVariants } from "@/lib/motion-presets";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

function NativeAppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const isAuthRoute = pathname.startsWith("/auth");
  const isLegalRoute = pathname.startsWith("/legal");
  const hideNav = shouldHideNativeAppNav(pathname);
  const hideHeader = shouldHideNativeAppHeader(pathname);
  const mainPb = nativeAppMainPadding(pathname);
  const isVoiceRoom = pathname.startsWith("/voice/") && pathname !== "/voice/new";
  const isAptImmersive = isAptImmersivePath(pathname ?? "");

  const pageMotion = reduced ? (
    <>{children}</>
  ) : (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        className="min-h-full"
        variants={nativeRouteVariants}
        initial="hidden"
        animate="show"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
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
