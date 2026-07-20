"use client";

import { memo, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import { SuspendedAccountBanner } from "@/components/account/suspended-account-banner";
import { FolkArtStage } from "@/components/brand/folk-decor";
import { mainScrollPaddingClass, shouldHideMobileNav } from "@/lib/mobile-shell";
import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";
import { isAptImmersivePath } from "@/lib/apt-route";
import { isFastHubPath } from "@/lib/hub-fast-path";
import { cn } from "@/lib/utils";
import { pageVariants } from "@/lib/motion-presets";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

function AppShellInner({
  children,
  rightPanel,
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isAuthRoute = pathname.startsWith("/auth");
  const isLegalRoute = pathname.startsWith("/legal");
  const isMessagesRoute = pathname.startsWith("/messages");
  const isCommunityServerRoute = /^\/c\/[^/]+/.test(pathname);
  const isVoiceRoom = pathname.startsWith("/voice/") && pathname !== "/voice/new";
  const isAptImmersive = isAptImmersivePath(pathname ?? "");
  const hideMobileNav = shouldHideMobileNav(pathname);
  const mainPb = mainScrollPaddingClass(pathname);
  const showRightPanel = shouldShowRightPanel(pathname);
  const reduced = usePrefersReducedMotion();
  const prevPathRef = useRef(pathname);
  const isProfileRoute = pathname.startsWith("/u/");
  const skipHubMotion =
    prevPathRef.current !== pathname &&
    isFastHubPath(prevPathRef.current) &&
    isFastHubPath(pathname);
  const prevPath = prevPathRef.current;
  prevPathRef.current = pathname;

  // 같은 커뮤니티 서버 안에서 채널만 바꿀 때는 셸 애니/전체 remount 키를 고정해 사이드바 유지
  const sameCommunityNav =
    isCommunityServerRoute &&
    /^\/c\/[^/]+/.test(prevPath) &&
    prevPath.split("/")[2] === pathname.split("/")[2];
  const motionKey = sameCommunityNav ? `/c/${pathname.split("/")[2]}` : pathname;

  // 메시지 라우트는 확정 높이가 필요하다(입력창을 하단에 고정하고 목록만 스크롤).
  // min-h-full 은 height:auto 라 h-full 체인을 무너뜨려 입력창이 잘려 사라진다.
  const motionClass =
    isMessagesRoute || isCommunityServerRoute ? "h-full min-h-0" : "min-h-full";

  const pageMotion =
    reduced || isProfileRoute || sameCommunityNav || skipHubMotion ? (
      <div key={motionKey} className={motionClass}>
        {children}
      </div>
    ) : (
      <motion.div
        key={motionKey}
        variants={pageVariants}
        initial="hidden"
        animate="show"
        className={motionClass}
      >
        {children}
      </motion.div>
    );

  if (isAuthRoute || isLegalRoute) {
    return (
      <main className="min-h-screen bg-background">
        <FolkArtStage dense>{children}</FolkArtStage>
      </main>
    );
  }

  if (isVoiceRoom) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  if (isAptImmersive) {
    return <main className="fixed inset-0 z-40 overflow-hidden bg-[#0a0a12]">{children}</main>;
  }

  return (
    <>
      <Header />
      <SuspendedAccountBanner />
      <div className="flex h-app overflow-hidden">
        <Sidebar />
        <main
          id="mocomo-main-scroll"
          className={cn(
            "flex-1 min-w-0 min-h-0 bg-background",
            showRightPanel && "shell-col-divider-r",
            isMessagesRoute
              ? `overflow-hidden ${mainPb}`
              : isProfileRoute
                ? `overflow-y-auto ${mainPb}`
                : `overflow-y-auto overflow-x-hidden ${mainPb}`
          )}
        >
          {isMessagesRoute ? (
            pageMotion
          ) : (
            <FolkArtStage dense className="min-h-full">
              {pageMotion}
            </FolkArtStage>
          )}
        </main>
        {showRightPanel ? rightPanel : null}
      </div>
      {!hideMobileNav && <MobileNav />}
      {!isMessagesRoute && (
        <footer className="hidden lg:block border-t border-border py-3 px-4 lg:px-6 bg-muted/20">
          <LegalFooterLinks />
        </footer>
      )}
    </>
  );
}

export const AppShell = memo(AppShellInner);
