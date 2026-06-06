"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

const CallProvider = dynamic(
  () => import("@/components/call/call-provider").then((m) => m.CallProvider),
  { ssr: false }
);

/** 로그인 사용자 — 메시지 화면 밖에서도 수신·발신 통화 */
export function CallProviderGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  if (status !== "authenticated") {
    return <>{children}</>;
  }
  return <CallProvider>{children}</CallProvider>;
}
