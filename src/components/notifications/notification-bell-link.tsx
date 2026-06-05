"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotificationUnread } from "@/hooks/use-notification-unread";

export function NotificationBellLink({ className }: { className?: string }) {
  const { unread } = useNotificationUnread();

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      title="알림"
      className={cn("rounded-xl relative", className)}
    >
      <Link href="/notifications">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#e53935] text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
