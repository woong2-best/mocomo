"use client";

import { memo } from "react";
import { usePathname } from "next/navigation";
import { NativeAppHeader } from "@/components/layout/native-app-header";
import { NativeAppNav } from "@/components/layout/native-app-nav";
import { NativeAppComposeFab } from "@/components/layout/native-app-compose-fab";
import { nativeAppMainPadding, shouldHideNativeAppNav } from "@/lib/native-app-shell";
import { isAptImmersivePath } from "@/lib/apt-route";

function NativeAppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");
  const isLegalRoute = pathname.startsWith("/legal");
  const hideNav = shouldHideNativeAppNav(pathname);
  const mainPb = nativeAppMainPadding(pathname);
  const isVoiceRoom = pathname.startsWith("/voice/") && pathname !== "/voice/new";
  const isAptImmersive = isAptImmersivePath(pathname ?? "");

  if (isVoiceRoom) {
    return <main className="min-h-dvh bg-background">{children}</main>;
  }

  if (isAptImmersive) {
    return <main className="fixed inset-0 z-40 overflow-hidden bg-[#0a0a12]">{children}</main>;
  }

  if (isAuthRoute || isLegalRoute) {
    return (
      <main className={`min-h-dvh bg-background pt-safe ${mainPb}`}>
        <div className="mx-auto w-full max-w-lg">{children}</div>
      </main>
    );
  }

  return (
    <>
      <NativeAppHeader />
      <main className={`min-h-[calc(100dvh-3.25rem)] bg-background ${mainPb}`}>
        <div className="mx-auto w-full max-w-lg min-h-full border-x border-border/40 bg-background">
          {children}
        </div>
      </main>
      {!hideNav && <NativeAppNav />}
      <NativeAppComposeFab />
    </>
  );
}

export const NativeAppShell = memo(NativeAppShellInner);
