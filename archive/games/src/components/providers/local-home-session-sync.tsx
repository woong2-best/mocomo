"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { clearLocalHomeData, setLocalHomeUserId } from "@/lib/apt/local-home-store";

/** 로그인·로그아웃·계정 전환 시 로컬 집/경제 캐시를 유저별로 분리 */
export function LocalHomeSessionSync() {
  const { data: session, status } = useSession();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    const userId = session?.user?.id ?? null;
    if (prevUserId.current && prevUserId.current !== userId) {
      void clearLocalHomeData(prevUserId.current);
    }

    setLocalHomeUserId(userId);
    prevUserId.current = userId;
  }, [session?.user?.id, status]);

  return null;
}
