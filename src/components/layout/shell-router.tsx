"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { NativeAppShell } from "@/components/layout/native-app-shell";
import { ClientPlatformProvider, useClientPlatform } from "@/components/providers/client-platform-provider";
import { isStudioHostname } from "@/studio/lib/host";
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
  const [isStudioHost, setIsStudioHost] = useState(false);

  useEffect(() => {
    setIsStudioHost(isStudioHostname(window.location.hostname));
  }, []);

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
}: {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}) {
  return (
    <ClientPlatformProvider initialPlatform="web">
      <ShellSwitch rightPanel={rightPanel}>{children}</ShellSwitch>
    </ClientPlatformProvider>
  );
}
