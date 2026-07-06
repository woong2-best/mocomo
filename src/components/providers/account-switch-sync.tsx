"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { exportCurrentAccount } from "@/lib/account-switch/client";

/** 로그인·세션 갱신 시 현재 계정을 기기 목록에 저장 */
export function AccountSwitchSync() {
  const { data: session, status } = useSession();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      if (status === "unauthenticated") lastUserId.current = null;
      return;
    }
    if (lastUserId.current === session.user.id) return;
    lastUserId.current = session.user.id;
    void exportCurrentAccount();
  }, [session?.user?.id, status]);

  return null;
}
