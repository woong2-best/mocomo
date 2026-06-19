"use client";

import { AppShell } from "@/components/layout/app-shell";
import { NativeAppShell } from "@/components/layout/native-app-shell";
import { ClientPlatformProvider, useClientPlatform } from "@/components/providers/client-platform-provider";
import type { ClientPlatform } from "@/lib/client-platform";
import { usePathname } from "next/navigation";

function ShellSwitch({
  children,
  rightPanel,
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isNativeApp } = useClientPlatform();

  if (pathname?.startsWith("/studio")) {
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
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  initialPlatform: ClientPlatform;
}) {
  return (
    <ClientPlatformProvider initialPlatform={initialPlatform}>
      <ShellSwitch rightPanel={rightPanel}>{children}</ShellSwitch>
    </ClientPlatformProvider>
  );
}
