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
  const isCommunityServerRoute = /^\/c\/[^/]+/.test(pathname);
  const skipTabMotion =
    prevPathRef.current !== pathname &&
    isFastHubPath(prevPathRef.current) &&
    isFastHubPath(pathname);
  const prevPath = prevPathRef.current;
  prevPathRef.current = pathname;
  const reduced = usePrefersReducedMotion();
  const isAuthRoute = pathname.startsWith("/auth");
  const isLegalRoute = pathname.startsWith("/legal");
  const hideNav = shouldHideNativeAppNav(pathname);
  const hideHeader = shouldHideNativeAppHeader(pathname);
  const mainPb = nativeAppMainPadding(pathname);
  const isVoiceRoom = pathname.startsWith("/voice/") && pathname !== "/voice/new";
  const isAptImmersive = isAptImmersivePath(pathname ?? "");

  // 채팅방·커뮤니티 서버는 확정 높이가 필요하다(입력창 하단 고정 + 목록만 스크롤).
  const isMessagesRoom = /^\/messages\/[^/]+$/.test(pathname);
  const sameCommunityNav =
    isCommunityServerRoute &&
    /^\/c\/[^/]+/.test(prevPath) &&
    prevPath.split("/")[2] === pathname.split("/")[2];
  const motionKey = sameCommunityNav ? `/c/${pathname.split("/")[2]}` : pathname;
  const motionClass =
    isMessagesRoom || isCommunityServerRoute ? "h-full min-h-0" : "min-h-full";

  const pageMotion =
    reduced || isProfileRoute || sameCommunityNav || skipTabMotion ? (
      <div key={motionKey} className={motionClass}>
        {children}
      </div>
    ) : (
      <motion.div
        key={motionKey}
        className={motionClass}
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
        className={`bg-background overscroll-y-contain ${
          isMessagesRoom ? "overflow-hidden" : "overflow-y-auto"
        } ${
          hideHeader ? "h-dvh pt-safe" : "h-[calc(100dvh-3.25rem-env(safe-area-inset-top,0px))]"
        } ${mainPb}`}
      >
        <div
          className={`mx-auto w-full max-w-lg border-x border-border/40 bg-background ${
            isMessagesRoom ? "h-full min-h-0" : "min-h-full"
          }`}
        >
          {pageMotion}
        </div>
      </main>
      {!hideNav && <NativeAppNav />}
      <NativeAppComposeFab />
    </>
  );
}

export const NativeAppShell = memo(NativeAppShellInner);
