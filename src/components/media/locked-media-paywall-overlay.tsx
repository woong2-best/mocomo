"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Twitter-style locked media chrome: blur sits on the media; this is the centered lock + label. */
export function LockedMediaPaywallOverlay({
  label = "결제하기",
  className,
  children,
}: {
  label?: string;
  className?: string;
  /** Optional CTA under the label (e.g. PayButton). If omitted, only label text shows. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 px-2 text-center",
        className
      )}
    >
      <Lock className="h-7 w-7 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" strokeWidth={2.25} />
      {children ?? (
        <p className="text-[13px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {label}
        </p>
      )}
    </div>
  );
}
