"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const CallProvider = dynamic(
  () => import("@/components/call/call-provider").then((m) => m.CallProvider),
  { ssr: false }
);

/** 통화 폴링·LiveKit은 DM/통화 관련 경로에서만 로드 */
function needsCallProvider(pathname: string): boolean {
  return (
    pathname.startsWith("/messages") ||
    pathname.startsWith("/voice") ||
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/notifications")
  );
}

export function CallProviderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (!needsCallProvider(pathname)) {
    return <>{children}</>;
  }
  return <CallProvider>{children}</CallProvider>;
}
