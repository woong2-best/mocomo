"use client";

import dynamic from "next/dynamic";
import { ClientPlatformProvider, useClientPlatform } from "@/components/providers/client-platform-provider";
import type { ClientPlatform } from "@/lib/client-platform";
import { isStudioHostname } from "@/studio/lib/host";
import { usePathname } from "next/navigation";

const AppShell = dynamic(
  () => import("@/components/layout/app-shell").then((m) => m.AppShell),
  { loading: () => <div className="min-h-dvh bg-background" aria-hidden /> }
);

const NativeAppShell = dynamic(
  () => import("@/components/layout/native-app-shell").then((m) => m.NativeAppShell),
  { loading: () => <div className="min-h-dvh bg-background" aria-hidden /> }
);

function ShellSwitch({
  children,
  rightPanel,
  isStudioHost,
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  isStudioHost: boolean;
}) {
  const pathname = usePathname();
  const { isNativeApp } = useClientPlatform();

  if (
    pathname?.startsWith("/studio") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/overlay") ||
    pathname?.startsWith("/obs") ||
    isStudioHost
  ) {
    return <>{children}</>;
  }

  if (isNativeApp) {
    return <NativeAppShell>{children}</NativeAppShell>;
  }
  return <AppShell rightPanel={rightPanel}>{children}</AppShell>;
}

export function ShellRouter({
  children,
  rightPanel,
  initialPlatform,
  isStudioHost,
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  initialPlatform: ClientPlatform;
  isStudioHost: boolean;
}) {
  return (
    <ClientPlatformProvider initialPlatform={initialPlatform}>
      <ShellSwitch rightPanel={rightPanel} isStudioHost={isStudioHost}>
        {children}
      </ShellSwitch>
    </ClientPlatformProvider>
  );
}
