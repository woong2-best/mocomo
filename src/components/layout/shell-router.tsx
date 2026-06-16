"use client";

import { AppShell } from "@/components/layout/app-shell";
import { NativeAppShell } from "@/components/layout/native-app-shell";
import { ClientPlatformProvider, useClientPlatform } from "@/components/providers/client-platform-provider";
import type { ClientPlatform } from "@/lib/client-platform";

function ShellSwitch({
  children,
  rightPanel,
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  const { isNativeApp } = useClientPlatform();
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
