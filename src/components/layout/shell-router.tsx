"use client";

import { AppShell } from "@/components/layout/app-shell";
import { NativeAppShell } from "@/components/layout/native-app-shell";
import { ClientPlatformProvider, useClientPlatform } from "@/components/providers/client-platform-provider";
import type { ClientPlatform } from "@/lib/client-platform";
import { isStudioHostname } from "@/studio/lib/host";
import { usePathname } from "next/navigation";

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

  if (pathname?.startsWith("/studio") || isStudioHost) {
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
