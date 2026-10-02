import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import type { ReactNode } from "react";
import { CHAT_PRESENCE_RING_CLASS } from "@/lib/chat-presence";
import { cn } from "@/lib/utils";

/** 접속 중일 때 아바타에 얇은 파란 테두리 */
export function PresenceAvatar({
  online,
  children,
  className,
  size = "md",
}: {
  online?: boolean;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const offset = size === "sm" ? "ring-offset-1" : "ring-offset-2";

  return (
    <div
      className={cn("relative inline-flex shrink-0 rounded-full", className)}
      title={online ? t("user.sq0t0ul") : undefined}
    >
      {children}
      {online ? (
        <span
          className={cn(
            "absolute inset-0 rounded-full pointer-events-none",
            CHAT_PRESENCE_RING_CLASS,
            offset
          )}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
