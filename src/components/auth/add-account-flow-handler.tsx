"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { finishAddAccountFlow, hasAddAccountFlowCookie } from "@/lib/account-switch/add-account-flow";

/** OAuth 등 redirect 로그인 후 새 계정을 저장 목록에 추가 */
export function AddAccountFlowHandler() {
  const { status } = useSession();
  const ran = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || ran.current || !hasAddAccountFlowCookie()) return;
    ran.current = true;
    void finishAddAccountFlow();
  }, [status]);

  return null;
}
