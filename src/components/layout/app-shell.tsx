"use client";

import { memo, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import { FolkArtStage } from "@/components/brand/folk-decor";
import { mainScrollPaddingClass, shouldHideMobileNav } from "@/lib/mobile-shell";
import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";
import { isAptImmersivePath } from "@/lib/apt-route";
import { isFastHubPath } from "@/lib/hub-fast-path";
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
  const isVoiceRoom = pathname.startsWith("/voice/") && pathname !== "/voice/new";
  const isAptImmersive = isAptImmersivePath(pathname ?? "");
  const hideMobileNav = shouldHideMobileNav(pathname);
  const mainPb = mainScrollPaddingClass(pathname);
  const showRightPanel = shouldShowRightPanel(pathname);
  const reduced = usePrefersReducedMotion();
  const prevPathRef = useRef(pathname);
  const skipHubMotion =
    prevPathRef.current !== pathname &&
    isFastHubPath(prevPathRef.current) &&
    isFastHubPath(pathname);
  prevPathRef.current = pathname;

  const pageMotion = reduced ? (
    <>{children}</>
  ) : skipHubMotion ? (
    <div key={pathname} className="min-h-full">
      {children}
    </div>
  ) : (
    <motion.div
      key={pathname}
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="min-h-full"
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
      <div className="flex min-h-app">
        <Sidebar />
        <main
          className={
            isMessagesRoute
              ? `flex-1 min-w-0 overflow-hidden bg-background ${mainPb}`
              : `flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-background ${mainPb}`
          }
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
        <footer className="hidden lg:block border-t-2 border-folk-cobalt/20 py-3 px-4 bg-[hsl(var(--folk-gold)/0.08)]">
          <LegalFooterLinks />
        </footer>
      )}
    </>
  );
}

export const AppShell = memo(AppShellInner);
