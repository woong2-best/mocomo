"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  NOTIFICATIONS_READ_EVENT,
  dispatchNotificationsRead,
} from "@/lib/notification-read-sync";
import { useIdleCallback } from "@/hooks/use-idle-callback";

export function useNotificationUnread() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { unread?: number };
      if (typeof data.unread === "number") setUnread(data.unread);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (pathname === "/notifications") {
      setUnread(0);
    }
  }, [pathname]);

  useIdleCallback(() => {
    if (pathname === "/notifications") return;
    void fetchUnread();
    const t = setInterval(() => void fetchUnread(), 60000);
    return () => clearInterval(t);
  }, [fetchUnread, pathname]);

  useEffect(() => {
    const onRead = () => setUnread(0);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, onRead);
    return () => window.removeEventListener(NOTIFICATIONS_READ_EVENT, onRead);
  }, []);

  return { unread, clearUnread: () => dispatchNotificationsRead() };
}
