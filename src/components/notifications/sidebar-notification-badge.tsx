"use client";

import { useNotificationUnread } from "@/hooks/use-notification-unread";

export function SidebarNotificationBadge() {
  const { unread } = useNotificationUnread();

  if (unread === 0) return null;

  return (
    <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-folk-terracotta text-[10px] font-bold text-white">
      {unread > 99 ? "99+" : unread}
    </span>
  );
}
