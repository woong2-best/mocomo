"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function WikiSpoiler({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      className={cn(
        "mx-0.5 rounded-md px-1 transition-all",
        open
          ? "bg-muted/60 text-inherit"
          : "bg-foreground/90 text-transparent hover:bg-foreground/75"
      )}
      aria-expanded={open}
      aria-label={open ? "Hide spoiler" : "Reveal spoiler"}
    >
      <span className={open ? undefined : "select-none blur-[3px]"}>{children}</span>
    </button>
  );
}
