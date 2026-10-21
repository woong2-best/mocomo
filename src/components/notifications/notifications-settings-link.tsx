"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/** Gear entry to /settings/notifications — Twitter-style from the alerts screen. */
export function NotificationsSettingsLink({ className }: { className?: string }) {
  return (
    <Link
      href="/settings/notifications"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted/60",
        className
      )}
      aria-label="알림 설정"
    >
      <Settings className="h-5 w-5" strokeWidth={2} />
    </Link>
  );
}
