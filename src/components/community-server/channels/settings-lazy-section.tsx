"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** 설정 패널 — 펼칠 때만 마운트해 초기 server action 폭주 방지 */
export function SettingsLazySection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(defaultOpen);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next) setMounted(true);
      return next;
    });
  }

  return (
    <section className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          {description ? (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && mounted ? <div className="px-4 pb-4 border-t border-border/60 pt-4">{children}</div> : null}
    </section>
  );
}
