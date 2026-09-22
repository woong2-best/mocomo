"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { performAdminWebSignOut } from "@/lib/admin/admin-web-sign-out";
import {
  ADMIN_WEB_SESSION_TTL_SEC,
  isAdminWebSessionExpired,
} from "@/lib/admin/web-session-ttl";

/** 관리자 웹 세션이 로그인 후 1시간이 되면 탭이 열려 있어도 로그아웃한다. */
export function AdminSessionAutoLogout() {
  const session = useSession();
  const started = session.data?.user?.adminSessionStartedAt;
  const isAdmin = Boolean(session.data?.user?.isStaff || session.data?.user?.isOperator);
  const loggingOut = useRef(false);

  useEffect(() => {
    if (!isAdmin || !started) return;

    const expireAtMs = (started + ADMIN_WEB_SESSION_TTL_SEC) * 1000;

    const logout = () => {
      if (loggingOut.current || !isAdminWebSessionExpired(started)) return;
      loggingOut.current = true;
      void performAdminWebSignOut("expired").catch(() => {
        loggingOut.current = false;
      });
    };

    const arm = () => {
      const remain = expireAtMs - Date.now();
      if (remain <= 0) {
        logout();
        return 0;
      }
      return window.setTimeout(arm, Math.min(remain, 15_000));
    };

    let timer = arm();
    const onVisible = () => {
      if (document.visibilityState === "visible") logout();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", logout);

    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", logout);
    };
  }, [isAdmin, started]);

  return null;
}
