"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { AppProviders } from "@/components/providers/app-providers";
import { ShellRouter } from "@/components/layout/shell-router";
import { ALEPH_PATH } from "@/lib/aleph-ticket";

export function RootChrome({
  children,
  rightPanel,
}: {
  children: ReactNode;
  rightPanel?: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === ALEPH_PATH || pathname.startsWith(`${ALEPH_PATH}/`)) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <AppProviders>
        <ShellRouter rightPanel={rightPanel}>{children}</ShellRouter>
      </AppProviders>
    </ThemeProvider>
  );
}
